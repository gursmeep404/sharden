from pymongo import MongoClient
from dotenv import load_dotenv
import os
from fastapi import FastAPI, HTTPException, Depends, status # <== for HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from bson import ObjectId                  # <== for ObjectId
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
import hashlib
import base64
from pydantic import BaseModel
from datetime import datetime, timedelta

from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict this to ["http://localhost", "http://localhost:8000"] if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def encrypt_aes(plain_text):
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()

    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(plain_text.encode()) + padder.finalize()
    encrypted = encryptor.update(padded_data) + encryptor.finalize()

    return base64.b64encode(iv + encrypted).decode()

def hash_value_pbkdf2(value, iterations=100_000):
    salt = b'\x9e\x1b]\xfb\x16%G\x9e\xf4\xd4\xe0\x13/4*\x7f'
    hash_bytes = hashlib.pbkdf2_hmac(
        'sha256',
        value.encode(),
        salt,
        iterations
    )
    return base64.b64encode(salt + hash_bytes).decode()

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
#this is used to get the account balance
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

'''





oauth2scheme= OAuth2PasswordBearer(tokenUrl="token")

'''
@app.post("/loans/{id}")
async def borrow(id:str,Amount:data): 
    return Amount
'''



SECRET_KEY = "ThisIsA32ByteConstKeyForAES256!!"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120



app = FastAPI()

class Token(BaseModel):
    access_token: str
    token_type: str

# Helper: authenticate user
async def authenticate_user(user_id: str, password: str):
    try:
        obj_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    user =  collection1.find_one({"_id": obj_id})
    if not user:
        return False

    hashed_input_password = hash_value_pbkdf2(password)
    if hashed_input_password != user.get("net_banking_password"):
        return False

    return str(user["_id"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
# Helper: create token
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=120)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
sessions_collection = db["Sessions"]

# Token endpoint
@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user_id = form_data.username
    password = form_data.password

    authenticated_user_id = await authenticate_user(user_id, password)
    if not authenticated_user_id:
        raise HTTPException(status_code=401, detail="Incorrect ID or password")

    access_token = create_access_token(data={"sub": authenticated_user_id})
    sessions_collection.insert_one({
        "user_id": str(user_id),
        "vendor_id": str("1"),
        "token": access_token,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=120)
    })
    return {"access_token": access_token, "token_type": "bearer"}


# Protected route example


credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return user_id
    except JWTError:
        raise credentials_exception
class data(BaseModel):
    data: str

@app.get("/me")
async def read_users_me(current_user: str = Depends(get_current_user)):
    return {"user_id": current_user}


@app.get("/accounts/{id}")
async def get_account(id: str, current_user: str = Depends(get_current_user)):
    if id != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to view this account")

    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")
    
    account = db["Accounts"].find_one({"_id": obj_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    decrypted_balance = decrypt_aes(account["Balance"])
    return {"balance": decrypted_balance}