from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
import hashlib
import base64
import os
from dotenv import load_dotenv
load_dotenv()  

AES_KEY = os.getenv("AES_KEY")


def encrypt_aes(plain_text):
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()

    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(plain_text.encode()) + padder.finalize()
    encrypted = encryptor.update(padded_data) + encryptor.finalize()

    return base64.b64encode(iv + encrypted).decode()
AES_KEY = os.getenv("AES_KEY")
if AES_KEY is None:
    raise ValueError("AES_KEY not set in .env")
AES_KEY = AES_KEY.encode("utf-8")
user_input = input("Account Holder Name: ")
a = encrypt_aes(user_input)
print(a)
