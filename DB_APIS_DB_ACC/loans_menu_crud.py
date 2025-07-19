import os
import base64
import hashlib
from pymongo import MongoClient
from dotenv import load_dotenv
from pprint import pprint
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding

# ========== ENV SETUP ==========
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
AES_KEY = os.getenv("AES_KEY").encode()
client = MongoClient(MONGO_URI)
db = client[os.getenv("DB_NAME")]
collection = db[os.getenv("COLLECTION_NAME_loans")]

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
def create_loan(data):
    doc = {
        "loan_id": data["loan_id"],
        "Debtors_name": encrypt_aes(data["Debtors_name"]),
        "Loan_amount": encrypt_aes(str(data["Loan_amount"])),
        "PAN": encrypt_aes(data["PAN"]),
        "default_amount": encrypt_aes(str(data["default_amount"])),
        "emi": encrypt_aes(str(data["emi"])),
        "interest": encrypt_aes(str(data["interest"])),
        "linked_acc_no": encrypt_aes(data["linked_acc_no"]),
        "pending_amount": encrypt_aes(str(data["pending_amount"])),
        "type": encrypt_aes(data["type"])
    }
    result = collection.insert_one(doc)
    return str(result.inserted_id)

def get_loan(loan_id):
    doc = collection.find_one({"loan_id": loan_id})
    if not doc:
        return None
    return {
        "_id": str(doc["_id"]),
        "loan_id": doc["loan_id"],
        "Debtors_name": decrypt_aes(doc["Debtors_name"]),
        "Loan_amount": int(decrypt_aes(doc["Loan_amount"])),
        "PAN": decrypt_aes(doc["PAN"]),
        "default_amount": int(decrypt_aes(doc["default_amount"])),
        "emi": int(decrypt_aes(doc["emi"])),
        "interest": int(decrypt_aes(doc["interest"])),
        "linked_acc_no": decrypt_aes(doc["linked_acc_no"]),
        "pending_amount": int(decrypt_aes(doc["pending_amount"])),
        "type": decrypt_aes(doc["type"])
    }

def update_pending_amount(loan_id, new_pending_amount):
    enc = encrypt_aes(str(new_pending_amount))
    result = collection.update_one({"loan_id": loan_id}, {"$set": {"pending_amount": enc}})
    return result.modified_count > 0

def delete_loan(loan_id):
    result = collection.delete_one({"loan_id": loan_id})
    return result.deleted_count > 0

# ========== CLI ==========
def input_loan_data():
    return {
        "loan_id": input("Loan ID: "),
        "Debtors_name": input("Debtor's Name: "),
        "Loan_amount": int(input("Loan Amount: ")),
        "PAN": input("PAN: "),
        "default_amount": int(input("Default Amount: ")),
        "emi": int(input("EMI: ")),
        "interest": int(input("Interest Rate (%): ")),
        "linked_acc_no": input("Linked Account Number: "),
        "pending_amount": int(input("Pending Amount: ")),
        "type": input("Loan Type (e.g. student/home): ")
    }

def menu():
    while True:
        print("\n====== LOAN MANAGEMENT MENU ======")
        print("1. Create New Loan Record")
        print("2. Fetch Loan Details")
        print("3. Update Pending Amount")
        print("4. Delete Loan Record")
        print("5. Exit")
        print("==================================")

        choice = input("Enter your choice: ")

        if choice == "1":
            data = input_loan_data()
            loan_id = create_loan(data)
            print("✅ Loan record created with ID:", loan_id)

        elif choice == "2":
            loan_id = input("Enter Loan ID to fetch: ")
            record = get_loan(loan_id)
            if record:
                print("✅ Loan Details:")
                pprint(record)
            else:
                print("❌ Loan not found.")

        elif choice == "3":
            loan_id = input("Enter Loan ID to update pending amount: ")
            new_amt = int(input("Enter new pending amount: "))
            if update_pending_amount(loan_id, new_amt):
                print("✅ Pending amount updated.")
            else:
                print("❌ Update failed.")

        elif choice == "4":
            loan_id = input("Enter Loan ID to delete: ")
            if delete_loan(loan_id):
                print("✅ Loan record deleted.")
            else:
                print("❌ Record not found.")

        elif choice == "5":
            print("👋 Exiting.")
            break

        else:
            print("⚠️ Invalid choice. Try again.")

if __name__ == "__main__":
    menu()
