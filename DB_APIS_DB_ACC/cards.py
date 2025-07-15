import os
import base64
import hashlib
from pprint import pprint
from pymongo import MongoClient
from dotenv import load_dotenv
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding

# ===================== ENV SETUP =====================
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
AES_KEY = os.getenv("AES_KEY").encode()  # must be 32 bytes
client = MongoClient(MONGO_URI)
db = client[os.getenv("DB_NAME")]
collection = db[os.getenv("COLLECTION_NAME_cards")]

# ===================== ENCRYPTION =====================
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

# ===================== HASHING =====================
def hash_pin(pin, iterations=100_000):
    salt = os.urandom(16)
    hash_bytes = hashlib.pbkdf2_hmac('sha256', pin.encode(), salt, iterations)
    return base64.b64encode(salt + hash_bytes).decode()

def verify_pin(stored_b64, input_pin, iterations=100_000):
    raw = base64.b64decode(stored_b64)
    salt = raw[:16]
    stored_hash = raw[16:]
    input_hash = hashlib.pbkdf2_hmac('sha256', input_pin.encode(), salt, iterations)
    return input_hash == stored_hash

# ===================== CRUD FUNCTIONS =====================
def create_card(data):
    enc_data = {
        "card_no": data["card_no"],
        "Linked_Acc_No": encrypt_aes(data["Linked_Acc_No"]),
        "Card_Holder_name": encrypt_aes(data["Card_Holder_name"]),
        "exp_date": encrypt_aes(data["exp_date"]),
        "atm_limit_daily": encrypt_aes(str(data["atm_limit_daily"])),
        "domestic_limit_daily": encrypt_aes(str(data["domestic_limit_daily"])),
        "limit": encrypt_aes(str(data["limit"])),
        "remaining_limit": encrypt_aes(str(data["remaining_limit"])),
        "tap_to_pay_daily": encrypt_aes(str(data["tap_to_pay_daily"])),
        "PAN": encrypt_aes(data["PAN"]),
        "int_ATM_LIMIT": encrypt_aes(str(data["int_ATM_LIMIT"])),
        "int_daily_limit": encrypt_aes(str(data["int_daily_limit"])),
        "int_tap_to_pay_limit": encrypt_aes(str(data["int_tap_to_pay_limit"])),
        "pin": hash_pin(data["pin"])
    }
    result = collection.insert_one(enc_data)
    return str(result.inserted_id)

def get_card(card_no):
    doc = collection.find_one({"card_no": card_no})
    if not doc:
        return None
    return {
        "_id": str(doc["_id"]),
        "card_no": doc["card_no"],
        "Linked_Acc_No": decrypt_aes(doc["Linked_Acc_No"]),
        "Card_Holder_name": decrypt_aes(doc["Card_Holder_name"]),
        "exp_date": decrypt_aes(doc["exp_date"]),
        "atm_limit_daily": int(decrypt_aes(doc["atm_limit_daily"])),
        "domestic_limit_daily": int(decrypt_aes(doc["domestic_limit_daily"])),
        "limit": int(decrypt_aes(doc["limit"])),
        "remaining_limit": int(decrypt_aes(doc["remaining_limit"])),
        "tap_to_pay_daily": int(decrypt_aes(doc["tap_to_pay_daily"])),
        "PAN": decrypt_aes(doc["PAN"]),
        "int_ATM_LIMIT": int(decrypt_aes(doc["int_ATM_LIMIT"])),
        "int_daily_limit": int(decrypt_aes(doc["int_daily_limit"])),
        "int_tap_to_pay_limit": int(decrypt_aes(doc["int_tap_to_pay_limit"]))
    }

def update_card_limit(card_no, new_limit):
    encrypted_limit = encrypt_aes(str(new_limit))
    result = collection.update_one({"card_no": card_no}, {"$set": {"limit": encrypted_limit}})
    return result.modified_count > 0

def delete_card(card_no):
    result = collection.delete_one({"card_no": card_no})
    return result.deleted_count > 0

# ===================== CLI MENU =====================
def input_card_data():
    return {
        "card_no": input("Card Number (plaintext): "),
        "Linked_Acc_No": input("Linked Account No: "),
        "Card_Holder_name": input("Card Holder Name: "),
        "exp_date": input("Expiry Date (MM/YY): "),
        "atm_limit_daily": int(input("ATM Daily Limit: ")),
        "domestic_limit_daily": int(input("Domestic Daily Limit: ")),
        "limit": int(input("Card Limit: ")),
        "remaining_limit": int(input("Remaining Limit: ")),
        "tap_to_pay_daily": int(input("Tap-to-Pay Daily Limit: ")),
        "PAN": input("PAN: "),
        "int_ATM_LIMIT": int(input("International ATM Limit: ")),
        "int_daily_limit": int(input("International Daily Limit: ")),
        "int_tap_to_pay_limit": int(input("International Tap-to-Pay Limit: ")),
        "pin": input("4-digit PIN: ")
    }

def menu():
    while True:
        print("\n====== CARD MANAGEMENT MENU ======")
        print("1. Create New Card")
        print("2. Fetch Card Details")
        print("3. Update Card Limit")
        print("4. Delete Card")
        print("5. Exit")
        print("==================================")

        choice = input("Enter your choice: ")

        if choice == "1":
            data = input_card_data()
            card_id = create_card(data)
            print("✅ Card created with ID:", card_id)

        elif choice == "2":
            card_no = input("Enter card number to fetch: ")
            card = get_card(card_no)
            if card:
                print("✅ Card Details:")
                pprint(card)
            else:
                print("❌ Card not found.")

        elif choice == "3":
            card_no = input("Enter card number to update limit: ")
            new_limit = int(input("Enter new limit amount: "))
            if update_card_limit(card_no, new_limit):
                print("✅ Card limit updated.")
            else:
                print("❌ Failed to update (card not found?).")

        elif choice == "4":
            card_no = input("Enter card number to delete: ")
            if delete_card(card_no):
                print("✅ Card deleted.")
            else:
                print("❌ Card not found or already deleted.")

        elif choice == "5":
            print("👋 Exiting.")
            break

        else:
            print("⚠️ Invalid choice. Try again.")

if __name__ == "__main__":
    menu()
