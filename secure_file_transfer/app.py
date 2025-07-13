from flask import Flask, render_template, request
import os
from utils.crypto import encrypt_file
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

    # Save encrypted file
    encrypted_path = os.path.join(app.config['UPLOAD_FOLDER'], f"enc_{filename}")
    with open(encrypted_path, 'wb') as f:
        f.write(encrypted['nonce'] + encrypted['tag'] + encrypted['ciphertext'])

    return f"File encrypted and saved as {encrypted_path}"

if __name__ == "__main__":
    app.run(debug=True)
