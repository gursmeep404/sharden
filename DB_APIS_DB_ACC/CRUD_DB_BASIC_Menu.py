from pymongo import MongoClient
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
import hashlib
import base64
import os
from dotenv import load_dotenv

# ===================== DB CONFIG =====================

load_dotenv()  # Automatically looks in the same folder as the script

AES_KEY = os.getenv("AES_KEY")
AES_KEY = AES_KEY.encode("utf-8")
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")
COLLECTION_NAME = os.getenv("COLLECTION_NAME_Accounts")
# ===================== CONNECT =====================
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]


# ===================== AES ENCRYPTION =====================
def encrypt_aes(plain_text):
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()

    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(plain_text.encode()) + padder.finalize()
    encrypted = encryptor.update(padded_data) + encryptor.finalize()

    return base64.b64encode(iv + encrypted).decode()

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

# ===================== HASHING W/ PBKDF2 =====================
def hash_value_pbkdf2(value, iterations=100_000):
    salt = b'\x9e\x1b]\xfb\x16%G\x9e\xf4\xd4\xe0\x13/4*\x7f'
    hash_bytes = hashlib.pbkdf2_hmac(
        'sha256',
        value.encode(),
        salt,
        iterations
    )
    return base64.b64encode(salt + hash_bytes).decode()

def verify_pbkdf2_hash(stored_b64, value, iterations=100_000):
    raw = base64.b64decode(stored_b64)
    salt = raw[:16]
    stored_hash = raw[16:]
    input_hash = hashlib.pbkdf2_hmac('sha256', value.encode(), salt, iterations)
    return input_hash == stored_hash

# ===================== CRUD FUNCTIONS =====================
def add_account():
    acc = {}
    acc["Acc_Holder_name"] = encrypt_aes(input("Account Holder Name: "))
    acc["Acc_type"] = input("Account Type: ")
    acc["Balance"] = encrypt_aes(input("Balance: "))
    acc["ISBN_no"] = input("ISBN No: ")
    acc["PAN_no"] = encrypt_aes(input("PAN No: "))
    acc["Phone_no"] = encrypt_aes(input("Phone Number: "))
    acc["email"] = encrypt_aes(input("Email: "))
    acc["Security_q_id"] = input("Security Question ID: ")
    acc["Sec_ans"] = hash_value_pbkdf2(input("Security Answer: "))
    acc["net_banking_password"] = hash_value_pbkdf2(input("Net Banking Password: "))
    collection.insert_one(acc)
    print("✅ Account added.\n")

def view_accounts():
    for acc in collection.find():
        print(f"ID: {acc['_id']}")
        print(f"Name: {decrypt_aes(acc['Acc_Holder_name'])}")
        print(f"Type: {acc['Acc_type']}")
        print(f"ISBN: {acc['ISBN_no']}")
        print(f"Balance: {decrypt_aes(acc['Balance'])}")
        print(f"PAN: {decrypt_aes(acc['PAN_no'])}")
        print(f"Security Question ID: {acc['ISBN_no']}")
        print(f"Phone: {decrypt_aes(acc['Phone_no'])}")
        print(f"Email: {decrypt_aes(acc['email'])}")
        print("-" * 40)

def modify_account():
    from bson import ObjectId
    id_str = input("Enter MongoDB _id to modify: ")
    try:
        obj_id = ObjectId(id_str)
    except:
        print("❌ Invalid ID format.")
        return

    field = input("Enter field to modify (Acc_Holder_name / Balance / PAN_no / Phone_no / email): ")
    new_val = input("Enter new value: ")

    if field in ["Acc_Holder_name", "PAN_no", "Phone_no", "email","Balance"]:
        new_val = encrypt_aes(new_val)
    else:
        print("❌ Invalid field.")
        return

    result = collection.update_one({"_id": obj_id}, {"$set": {field: new_val}})
    if result.modified_count:
        print("✅ Account updated.")
    else:
        print("⚠️ No matching account or no change made.")

def delete_account():
    from bson import ObjectId
    id_str = input("Enter MongoDB _id to delete: ")
    try:
        obj_id = ObjectId(id_str)
    except:
        print("❌ Invalid ID format.")
        return

    result = collection.delete_one({"_id": obj_id})
    if result.deleted_count:
        print("✅ Account deleted.")
    else:
        print("⚠️ No account found.")


def modify_pass():
    from bson import ObjectId
    id_str = input("Enter MongoDB _id to modify: ")
    try:
        obj_id = ObjectId(id_str)
    except:
        print("❌ Invalid ID format.")
        return

    field = "net_banking_password"
    new_val = input("Enter new value: ")
    new_val = hash_value_pbkdf2(new_val)



    result = collection.update_one({"_id": obj_id}, {"$set": {field: new_val}})
    if result.modified_count:
        print("✅ Account updated.")
    else:
        print("⚠️ No matching account or no change made.")
# ===================== MAIN MENU =====================
def menu():
    while True:
        print("\n--- MENU ---")
        print("1. Add Account")
        print("2. View Accounts")
        print("3. Modify Account")
        print("4. Delete Account")
        print("5. Exit")

        choice = input("Choice: ")

        if choice == '1':
            add_account()
        elif choice == '2':
            view_accounts()
        elif choice == '3':
            modify_account()
        elif choice == '4':
            delete_account()
        
        elif choice == '6':
            modify_pass()
        elif choice == '5':
            break

        else:
            print("❌ Invalid choice.")

menu()
