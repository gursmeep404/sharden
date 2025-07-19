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

def hash_value_pbkdf2(value, iterations=100_000):
    salt = b'\x9e\x1b]\xfb\x16%G\x9e\xf4\xd4\xe0\x13/4*\x7f'
    hash_bytes = hashlib.pbkdf2_hmac(
        'sha256',
        value.encode(),
        salt,
        iterations
    )
    return base64.b64encode(salt + hash_bytes).decode()

print(hash_value_pbkdf2("Advit@12345"))
