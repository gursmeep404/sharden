import os
import base64
from pymongo import MongoClient
from dotenv import load_dotenv
from pprint import pprint
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
from datetime import datetime

# ========== ENV SETUP ==========
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
AES_KEY = os.getenv("AES_KEY").encode()
client = MongoClient(MONGO_URI)
db = client[os.getenv("DB_NAME")]
collection = db[os.getenv("COLLECTION_NAME_transactions")]

# ========== AES ENCRYPTION ==========
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

# ========== CRUD ==========
def create_transaction(data):
    doc = {
        "amount": encrypt_aes(str(data["amount"])),
        "medium": encrypt_aes(data["medium"]),
        "recievers_account_no": encrypt_aes(data["recievers_account_no"]),
        "senders_account_no": encrypt_aes(data["senders_account_no"]),
        "time_of_transaction": encrypt_aes(data["time_of_transaction"])
    }
    result = collection.insert_one(doc)
    return str(result.inserted_id)

def get_transaction(transaction_id):
    from bson import ObjectId
    doc = collection.find_one({"_id": ObjectId(transaction_id)})
    if not doc:
        return None
    return {
        "_id": str(doc["_id"]),
        "amount": float(decrypt_aes(doc["amount"])),
        "medium": decrypt_aes(doc["medium"]),
        "recievers_account_no": decrypt_aes(doc["recievers_account_no"]),
        "senders_account_no": decrypt_aes(doc["senders_account_no"]),
        "time_of_transaction": decrypt_aes(doc["time_of_transaction"])
    }

def delete_transaction(transaction_id):
    from bson import ObjectId
    result = collection.delete_one({"_id": ObjectId(transaction_id)})
    return result.deleted_count > 0

# ========== CLI ==========
def input_transaction_data():
    return {
        "amount": float(input("Transaction Amount: ")),
        "medium": input("Transaction Medium (e.g. net_banking, UPI): "),
        "recievers_account_no": input("Receiver's Account Number: "),
        "senders_account_no": input("Sender's Account Number: "),
        "time_of_transaction": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

def menu():
    while True:
        print("\n====== TRANSACTION MENU ======")
        print("1. Create Transaction")
        print("2. Fetch Transaction by ID")
        print("3. Delete Transaction by ID")
        print("4. Exit")
        print("==================================")

        choice = input("Enter your choice: ")

        if choice == "1":
            data = input_transaction_data()
            tx_id = create_transaction(data)
            print("✅ Transaction recorded with ID:", tx_id)

        elif choice == "2":
            tx_id = input("Enter Transaction ID to fetch: ")
            tx = get_transaction(tx_id)
            if tx:
                print("✅ Transaction Details:")
                pprint(tx)
            else:
                print("❌ Transaction not found.")

        elif choice == "3":
            tx_id = input("Enter Transaction ID to delete: ")
            if delete_transaction(tx_id):
                print("✅ Transaction deleted.")
            else:
                print("❌ Not found or already deleted.")

        elif choice == "4":
            print("👋 Exiting.")
            break

        else:
            print("⚠️ Invalid choice. Try again.")

if __name__ == "__main__":
    menu()
