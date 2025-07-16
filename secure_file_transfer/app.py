from flask import Flask, render_template, request
import os
from utils.crypto import encrypt_file, decrypt_file
from Crypto.Random import get_random_bytes

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

    filename = file.filename
    path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(path)

    # Generate random AES key
    key = get_random_bytes(16)

    encrypted = encrypt_file(path, key)

    encrypted_path = os.path.join(app.config['UPLOAD_FOLDER'], f"enc_{filename}")
    with open(encrypted_path, 'wb') as f:
        f.write(encrypted['nonce'] + encrypted['tag'] + encrypted['ciphertext'])

    return f"File encrypted and saved as {encrypted_path}"



@app.route('/download/<filename>', methods=['GET'])
def download(filename):
    enc_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    with open(enc_path, 'rb') as f:
        content = f.read()
    nonce = content[:16]
    tag = content[16:32]
    ciphertext = content[32:]

    # Key should be securely shared or derived — for demo, load from file
    with open(os.path.join(app.config['UPLOAD_FOLDER'], f"{filename}.key"), 'rb') as kf:
        key = kf.read()

    try:
        decrypted = decrypt_file(ciphertext, key, nonce, tag)
        return decrypted
    except Exception as e:
        return f"Decryption failed: {str(e)}", 400
    
if __name__ == "__main__":
    app.run(debug=True)