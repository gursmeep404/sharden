from pymongo import MongoClient
from dotenv import load_dotenv
import os
from fastapi import FastAPI, HTTPException  # <== for HTTPException
from bson import ObjectId                  # <== for ObjectId
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
import hashlib
import base64


def decrypt_aes(cipher_text):
    raw = base64.b64decode(cipher_text)
    iv = raw[:16]
    encrypted = raw[16:]

    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()

    decrypted_padded = decryptor.update(encrypted) + decryptor.finalize()
    unpadder = padding.PKCS7(128).unpadder()
    decrypted = unpadder.update(decrypted_padded) + unpadder.finalize()
    return decrypted.decode()


# Load .env
load_dotenv()

# Get DB info
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")
COLLECTION_NAME_Accounts=os.getenv("COLLECTION_NAME_Accounts")
AES_KEY = os.getenv("AES_KEY")
AES_KEY = AES_KEY.encode("utf-8")

# Mongo setup
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection1 = db[COLLECTION_NAME_Accounts]
# FastAPI app
app = FastAPI()

@app.get("/")
def home():
    return {"message": "MongoDB is connected!"}

'''
@app.get("/accounts/{id}")
async def get_account(id: str):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")

    account = db["Accounts"].find_one({"_id": obj_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    account["_id"] = str(account["_id"])  # Convert ObjectId to string for JSON serialization
    return account
'''


'''
@app.get("/accounts/{id}")
async def get_account(id: str):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")

    account = db["Accounts"].find_one({"_id": obj_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    return {"balance": account["Balance"]}
    '''
@app.get("/accounts/{id}")
async def get_account(id: str):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")
    
    account = db["Accounts"].find_one({"_id": obj_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Decrypt the balance before returning
    decrypted_balance = decrypt_aes(account["Balance"])
    return {"balance": decrypted_balance}