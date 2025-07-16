from flask import Flask, render_template, request, send_file, abort
import os, io
from werkzeug.utils import secure_filename
from utils.crypto import encrypt_file, decrypt_file
from Crypto.Random import get_random_bytes
import json, time
from datetime import timedelta



app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.route('/')
def index():
    return render_template('upload.html')

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']
    recipient = request.form['recipient']

    filename = secure_filename(file.filename)
    path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(path)

    key = get_random_bytes(16)
    encrypted = encrypt_file(path, key)

    enc_name = f"enc_{filename}"
    enc_path = os.path.join(app.config['UPLOAD_FOLDER'], enc_name)
    with open(enc_path, 'wb') as f:
        f.write(encrypted['nonce'] + encrypted['tag'] + encrypted['ciphertext'])

    # Save key for demo
    with open(os.path.join(app.config['UPLOAD_FOLDER'], f"{enc_name}.key"), 'wb') as kf:
        kf.write(key)

    # Save metadata
    metadata = {
        "recipient": recipient,
        "expiry_time": time.time() + timedelta(minutes=2).total_seconds(),  
        "revoked": False
    }
    meta_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{enc_name}.meta.json")
    with open(meta_path, 'w') as mf:
        json.dump(metadata, mf)

    return render_template("success.html", filename=enc_name, expiry=metadata["expiry_time"])

@app.route('/download/<filename>', methods=['GET'])
def download(filename):
    safe_name = secure_filename(filename)
    enc_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_name)
    meta_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{safe_name}.meta.json")
    key_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{safe_name}.key")

    # Check if files exist
    if not os.path.exists(enc_path):
        return abort(404, "Encrypted file not found.")
    if not os.path.exists(meta_path):
        return abort(404, "Metadata not found.")
    if not os.path.exists(key_path):
        return abort(400, "Encryption key missing (demo mode).")

    # Load metadata and enforce policies
    with open(meta_path, 'r') as mf:
        metadata = json.load(mf)

    if time.time() > metadata["expiry_time"]:
        return abort(403, "Access denied: File expired.")
    if metadata.get("revoked", False):
        return abort(403, "Access denied: File revoked by owner.")

    # Load encrypted content
    with open(enc_path, 'rb') as f:
        content = f.read()

    nonce = content[:16]
    tag = content[16:32]
    ciphertext = content[32:]

    # Load AES key
    with open(key_path, 'rb') as kf:
        key = kf.read()

    # Decrypt
    try:
        decrypted = decrypt_file(ciphertext, key, nonce, tag)
    except Exception as e:
        return abort(400, f"Decryption failed: {e}")

    # Infer original filename
    download_name = safe_name[len("enc_"):] if safe_name.startswith("enc_") else f"dec_{safe_name}"

    # Send decrypted file as download
    return send_file(
        io.BytesIO(decrypted),
        as_attachment=True,
        download_name=download_name
    )


@app.route('/revoke/<filename>', methods=['POST'])
def revoke(filename):
    safe_name = secure_filename(filename)
    meta_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{safe_name}.meta.json")

    if not os.path.exists(meta_path):
        return abort(404, "Metadata not found.")

    with open(meta_path, 'r') as mf:
        metadata = json.load(mf)

    metadata["revoked"] = True

    with open(meta_path, 'w') as mf:
        json.dump(metadata, mf)

    return f"Access to {filename} has been revoked."


if __name__ == "__main__":
    app.run(debug=True)
