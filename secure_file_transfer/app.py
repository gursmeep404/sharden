from flask import Flask, request, jsonify, send_file
import os, io, json, time, uuid, csv
from werkzeug.utils import secure_filename
from utils.crypto import encrypt_file, decrypt_file
from Crypto.Random import get_random_bytes
from flask_cors import CORS

app = Flask(__name__)

# Origin only for hackathon. Not for production
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

AUDIT_LOG = os.path.join(app.config['UPLOAD_FOLDER'], "audit_log.csv")

# init audit log
if not os.path.exists(AUDIT_LOG):
    with open(AUDIT_LOG, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "action", "file_id", "status", "details"])


def log_action(action, file_id, status, details=""):
    with open(AUDIT_LOG, 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([int(time.time()), action, file_id, status, details])


def _paths_for(file_id: str):
    return (
        os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.meta.json"),
        os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.bin"),
        os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.key"),
    )


def load_metadata_all():
    files = []
    for name in os.listdir(app.config['UPLOAD_FOLDER']):
        if name.endswith('.meta.json'):
            path = os.path.join(app.config['UPLOAD_FOLDER'], name)
            try:
                with open(path, 'r') as f:
                    files.append(json.load(f))
            except Exception as e:
                log_action("META_READ", name, "FAILED", str(e))
    return files


@app.route('/api/files', methods=['POST'])
def upload_file():
    file = request.files.get('file')
    recipient_email = request.form.get('recipient_email') or request.form.get('recipient')
    sender_email = request.form.get('sender_email') 

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    file_id = str(uuid.uuid4())
    filename = secure_filename(file.filename) or "upload.bin"
    original_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(original_path)

    # Encrypt file with one‑time symmetric key
    key = get_random_bytes(16)
    encrypted = encrypt_file(original_path, key)  

    # Write encrypted blob: nonce|tag|ciphertext
    enc_name = f"{file_id}.bin"
    enc_path = os.path.join(app.config['UPLOAD_FOLDER'], enc_name)
    with open(enc_path, 'wb') as f:
        f.write(encrypted['nonce'] + encrypted['tag'] + encrypted['ciphertext'])

    # Persist key 
    with open(os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.key"), 'wb') as kf:
        kf.write(key)

    
    expiry_ts = int(time.time() + 300)
    metadata = {
        "file_id": file_id,
        "original_filename": filename,
        "encrypted_filename": enc_name,
        "expiry_time": expiry_ts,
        "revoked": False,
        "sender_email": sender_email,
        "recipient_email": recipient_email,
    }
    meta_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.meta.json")
    with open(meta_path, 'w') as mf:
        json.dump(metadata, mf)

    log_action("UPLOAD", file_id, "SUCCESS", f"Sender={sender_email} Recipient={recipient_email}")
    return jsonify(metadata), 201


@app.route('/api/files', methods=['GET'])
def list_files():
    recipient_filter = request.args.get('recipient')  
    sender_filter = request.args.get('sender')        

    files = load_metadata_all()

    if recipient_filter:
        files = [f for f in files if (f.get('recipient_email') or '').lower() == recipient_filter.lower()]
    if sender_filter:
        files = [f for f in files if (f.get('sender_email') or '').lower() == sender_filter.lower()]

    return jsonify(files), 200


@app.route('/api/files/<file_id>/download', methods=['GET'])
def download_file(file_id):
    meta_path, enc_path, key_path = _paths_for(file_id)

    if not os.path.exists(meta_path):
        return jsonify({"error": "Metadata not found"}), 404
    if not os.path.exists(enc_path) or not os.path.exists(key_path):
        return jsonify({"error": "Encrypted file or key missing"}), 404

    with open(meta_path, 'r') as mf:
        metadata = json.load(mf)

    now = time.time()
    if now > metadata["expiry_time"]:
        log_action("DOWNLOAD", file_id, "FAILED", "Expired")
        return jsonify({"error": "Access denied: File expired"}), 403
    if metadata.get("revoked", False):
        log_action("DOWNLOAD", file_id, "FAILED", "Revoked")
        return jsonify({"error": "Access denied: File revoked"}), 403

    with open(enc_path, 'rb') as f:
        content = f.read()
    nonce, tag, ciphertext = content[:16], content[16:32], content[32:]

    with open(key_path, 'rb') as kf:
        key = kf.read()

    try:
        decrypted = decrypt_file(ciphertext, key, nonce, tag)
    except Exception as e:
        log_action("DOWNLOAD", file_id, "FAILED", str(e))
        return jsonify({"error": f"Decryption failed: {e}"}), 400

    download_name = metadata.get("original_filename", "download.bin")
    log_action("DOWNLOAD", file_id, "SUCCESS")
    return send_file(io.BytesIO(decrypted), as_attachment=True, download_name=download_name)


@app.route('/api/files/<file_id>/revoke', methods=['POST'])
def revoke_file(file_id):
    meta_path, _, _ = _paths_for(file_id)
    if not os.path.exists(meta_path):
        return jsonify({"error": "Metadata not found"}), 404

    with open(meta_path, 'r') as mf:
        metadata = json.load(mf)

    metadata["revoked"] = True
    with open(meta_path, 'w') as mf:
        json.dump(metadata, mf)

    log_action("REVOKE", file_id, "SUCCESS")
    return jsonify({"message": "File revoked", "file_id": file_id}), 200


@app.route('/api/logs', methods=['GET'])
def get_logs():
    if not os.path.exists(AUDIT_LOG):
        return jsonify([]), 200
    logs = []
    with open(AUDIT_LOG, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            logs.append(row)
    return jsonify(logs), 200


if __name__ == "__main__":
    
    app.run(host='0.0.0.0', port=5000, debug=True)