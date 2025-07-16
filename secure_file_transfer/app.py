from flask import Flask, request, jsonify, send_file, abort
import os, io, json, time, uuid, csv
from werkzeug.utils import secure_filename
from utils.crypto import encrypt_file, decrypt_file
from Crypto.Random import get_random_bytes

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

AUDIT_LOG = os.path.join(app.config['UPLOAD_FOLDER'], "audit_log.csv")

# audit log if missing
if not os.path.exists(AUDIT_LOG):
    with open(AUDIT_LOG, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "action", "file_id", "status", "details"])

def log_action(action, file_id, status, details=""):
    with open(AUDIT_LOG, 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([int(time.time()), action, file_id, status, details])

@app.route('/api/files', methods=['POST'])
def upload_file():
    file = request.files.get('file')
    recipient = request.form.get('recipient')

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    file_id = str(uuid.uuid4())
    filename = secure_filename(file.filename)
    original_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(original_path)

    # Encrypt file
    key = get_random_bytes(16)
    encrypted = encrypt_file(original_path, key)

    enc_name = f"{file_id}.bin"
    enc_path = os.path.join(app.config['UPLOAD_FOLDER'], enc_name)
    with open(enc_path, 'wb') as f:
        f.write(encrypted['nonce'] + encrypted['tag'] + encrypted['ciphertext'])


    with open(os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.key"), 'wb') as kf:
        kf.write(key)

    # Metadata
    expiry_ts = int(time.time() + 300)  
    metadata = {
        "file_id": file_id,
        "original_filename": filename,
        "encrypted_filename": enc_name,
        "expiry_time": expiry_ts,
        "revoked": False,
        "recipient": recipient
    }
    meta_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.meta.json")
    with open(meta_path, 'w') as mf:
        json.dump(metadata, mf)

    log_action("UPLOAD", file_id, "SUCCESS", f"Uploaded by {recipient}")
    return jsonify(metadata), 201

@app.route('/api/files', methods=['GET'])
def list_files():
    files = []
    for name in os.listdir(app.config['UPLOAD_FOLDER']):
        if name.endswith(".meta.json"):
            with open(os.path.join(app.config['UPLOAD_FOLDER'], name), 'r') as f:
                meta = json.load(f)
                files.append(meta)
    return jsonify(files), 200

@app.route('/api/files/<file_id>/download', methods=['GET'])
def download_file(file_id):
    meta_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.meta.json")
    enc_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.bin")
    key_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.key")

    if not os.path.exists(meta_path):
        return jsonify({"error": "Metadata not found"}), 404
    if not os.path.exists(enc_path) or not os.path.exists(key_path):
        return jsonify({"error": "Encrypted file or key missing"}), 404

    with open(meta_path, 'r') as mf:
        metadata = json.load(mf)

    if time.time() > metadata["expiry_time"]:
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

    download_name = metadata["original_filename"]
    log_action("DOWNLOAD", file_id, "SUCCESS")
    return send_file(io.BytesIO(decrypted), as_attachment=True, download_name=download_name)

@app.route('/api/files/<file_id>/revoke', methods=['POST'])
def revoke_file(file_id):
    meta_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.meta.json")
    if not os.path.exists(meta_path):
        return jsonify({"error": "Metadata not found"}), 404

    with open(meta_path, 'r') as mf:
        metadata = json.load(mf)

    metadata["revoked"] = True
    with open(meta_path, 'w') as mf:
        json.dump(metadata, mf)

    log_action("REVOKE", file_id, "SUCCESS")
    return jsonify({"message": "File revoked successfully", "file_id": file_id}), 200

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
    app.run(debug=True)
