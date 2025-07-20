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
from fastapi import Form

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

clients_db = {
    "trusted-client-id": {
        "client_secret": "super-secret",
        "vendor_id": "1A"
    },
    "test-client": {
        "client_secret": "test-secret",
        "vendor_id": "TEST"
    }
}

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
class OAuth2PasswordRequestFormWithClient:
    def __init__(
        self,
        username: str = Form(...),
        password: str = Form(...),
        scope: str = Form(""),
        client_id: str = Form(...),
        client_secret: str = Form(...)
    ):
        self.username = username
        self.password = password
        self.scope = scope
        self.client_id = client_id
        self.client_secret = client_secret

# Token endpoint
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestFormWithClient = Depends()):
    # Validate client credentials
    #if form_data.client_id != "expected_id" or form_data.client_secret != "expected_secret":
      #  raise HTTPException(status_code=401, detail="Invalid client credentials")
    # Validate client credentials

    '''if not client or client["client_secret"] != form_data.client_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )'''
    """OAuth2 token endpoint"""
    # Debug logging - remove in production
    print(f"DEBUG: Received client_id: '{form_data.client_id}'")
    print(f"DEBUG: Received client_secret: '{form_data.client_secret}'")
    print(f"DEBUG: Available clients: {list(clients_db.keys())}")
    
    # Validate client credentials
    client = clients_db.get(form_data.client_id)
    print(f"DEBUG: Found client: {client}")
    
    if not client:
        print(f"DEBUG: Client '{form_data.client_id}' not found in database")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Client '{form_data.client_id}' not found",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if client["client_secret"] != form_data.client_secret:
        print(f"DEBUG: Secret mismatch. Expected: '{client['client_secret']}', Got: '{form_data.client_secret}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Client secret mismatch",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    print("DEBUG: Client authentication successful")

    # Validate user
    user_id = await authenticate_user(form_data.username, form_data.password)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Create token
    access_token = create_access_token({"sub": user_id})

    # Store in Sessions collection
    session = {
        "vendor_id": form_data.client_id,
        "user_id": user_id,
        "token": access_token,
        "created_at": datetime.utcnow()
    }
    sessions_collection.insert_one(session)

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


