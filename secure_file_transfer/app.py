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
    if not os.path.exists(enc_path):
        return abort(404, "Encrypted file not found.")

    with open(enc_path, 'rb') as f:
        content = f.read()

    nonce = content[:16]
    tag = content[16:32]
    ciphertext = content[32:]

    key_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{safe_name}.key")
    if not os.path.exists(key_path):
        return abort(400, "Encryption key missing (demo mode).")

    with open(key_path, 'rb') as kf:
        key = kf.read()

    try:
        decrypted = decrypt_file(ciphertext, key, nonce, tag)
    except Exception as e:
        return abort(400, f"Decryption failed: {e}")

    # Infer original filename by stripping "enc_"
    if safe_name.startswith("enc_"):
        download_name = safe_name[len("enc_"):]
    else:
        download_name = f"dec_{safe_name}"

    # Send from memory
    return send_file(
        io.BytesIO(decrypted),
        as_attachment=True,
        download_name=download_name
    )

if __name__ == "__main__":
    app.run(debug=True)
