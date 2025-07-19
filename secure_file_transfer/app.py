"""
Flask backend for SHARDEN Secure File Transfer (DB-backed).

Replaces filesystem metadata (.meta.json, .key) and CSV audit log with
PostgreSQL tables accessed via SQLAlchemy ORM. Encrypted file *bytes* are still
stored on disk (uploads/<file_id>.bin>) for performance/simplicity; DB stores
metadata, IV, and legacy key (if server-side encrypted).

Supports two modes:

1. E2E MODE  (Bank browser encrypts, uploads ciphertext)
   - Frontend sends: file (ciphertext blob), sender_email, recipient_email,
     iv_b64, mime_type, original_name.
   - Server stores ciphertext as-is; **no key** stored.
   - Client (vendor) downloads via /api/files/<id>/raw and decrypts locally.

2. LEGACY MODE (Server-side encrypt)
   - Frontend sends plaintext file (no iv_b64 field).
   - Server generates AES key, encrypts with utils.crypto.encrypt_file(),
     stores nonce|tag|ciphertext in uploads, base64 key in DB.
   - Vendor may download plaintext via /download (server decrypt) OR
     ciphertext via /raw (advanced).

API contract with existing Next.js frontends is preserved: responses still
include epoch-seconds `expiry_time`, `revoked`, and E2E indicators.
"""

from __future__ import annotations

import os
import io
import uuid
import base64
import traceback
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Local imports
from utils.crypto import encrypt_file, decrypt_file  # legacy server-side enc/dec
from Crypto.Random import get_random_bytes

# SQLAlchemy / DB
from sqlalchemy.orm import Session
from database.database import SessionLocal  # your configured engine/sessionmaker
from database.models import SecureFile, FileAuditLog


# -----------------------------------------------------------------------------
# App setup
# -----------------------------------------------------------------------------
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Demo only, not prod

UPLOAD_DIR = os.path.abspath(os.getenv("UPLOAD_FOLDER", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Configurable expiry (minutes)
DEFAULT_EXPIRY_MINUTES = int(os.getenv("FILE_EXPIRY_MINUTES", "5"))


# -----------------------------------------------------------------------------
# Serialization helpers
# -----------------------------------------------------------------------------

def secure_file_to_dict(obj: SecureFile) -> Dict[str, Any]:
    """Convert SecureFile ORM row to JSON shape expected by frontend."""
    expiry_epoch = int(obj.expiry_time.replace(tzinfo=timezone.utc).timestamp()) if obj.expiry_time else None
    return {
        "file_id": str(obj.id),
        "original_filename": obj.original_filename,
        "expiry_time": expiry_epoch,
        "revoked": obj.revoked,
        "sender_email": obj.sender_email,
        "recipient_email": obj.recipient_email,
        "mime_type": obj.mime_type,
        "iv_b64": obj.iv_b64,
        "e2e": obj.e2e,
    }


def log_action(db: Session, action: str, file_id: Optional[uuid.UUID], status: str, details: str = "") -> None:
    """Write an audit log row."""
    log_row = FileAuditLog(file_id=file_id, action=action, status=status, details=details)
    db.add(log_row)
    # caller should commit() or rollback() appropriately


# -----------------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------------

@app.route("/api/files", methods=["POST"])
def upload_file():
    """Upload endpoint supporting E2E and legacy modes.

    Request form fields:
      file:              uploaded file (plaintext OR ciphertext)
      recipient_email:   required
      sender_email:      required (for audit)
      iv_b64:            if present => E2E mode. file is ciphertext; no key stored.
      mime_type:         optional; default application/octet-stream
      original_name:     optional; else taken from upload filename
    """
    db: Session = SessionLocal()
    try:
        file = request.files.get("file")
        recipient_email = request.form.get("recipient_email") or request.form.get("recipient")
        sender_email = request.form.get("sender_email")
        iv_b64 = request.form.get("iv_b64")  # if present => E2E
        mime_type = request.form.get("mime_type") or "application/octet-stream"
        original_filename = request.form.get("original_name")

        if not file:
            return jsonify({"error": "No file uploaded"}), 400
        if not recipient_email:
            return jsonify({"error": "Missing recipient_email"}), 400
        if not sender_email:
            sender_email = "unknown@unknown"  # fallback to avoid NULL

        file_uuid = uuid.uuid4()
        safe_name = secure_filename(original_filename or file.filename or "upload.bin")
        enc_path = os.path.join(UPLOAD_DIR, f"{file_uuid}.bin")

        expiry_dt = datetime.now(timezone.utc) + timedelta(minutes=DEFAULT_EXPIRY_MINUTES)

        if iv_b64:
            # -----------------------------------------------------------------
            # E2E MODE: incoming file is ciphertext. Store as-is.
            # -----------------------------------------------------------------
            file.save(enc_path)
            encrypted_size = os.path.getsize(enc_path)

            sf = SecureFile(
                id=file_uuid,
                original_filename=safe_name,
                storage_path=enc_path,
                mime_type=mime_type,
                sender_email=sender_email,
                recipient_email=recipient_email,
                expiry_time=expiry_dt,
                revoked=False,
                e2e=True,
                iv_b64=iv_b64,
                legacy_key_b64=None,
                encrypted_size=encrypted_size,
            )
            db.add(sf)
            log_action(db, "UPLOAD_E2E", file_uuid, "SUCCESS", f"Sender={sender_email} Recipient={recipient_email}")
            db.commit()
            return jsonify(secure_file_to_dict(sf)), 201

        # ---------------------------------------------------------------------
        # LEGACY MODE: incoming file is plaintext. Encrypt server-side.
        # ---------------------------------------------------------------------
        tmp_path = os.path.join(UPLOAD_DIR, f"tmp_{file_uuid}_{safe_name}")
        file.save(tmp_path)

        key = get_random_bytes(16)
        encrypted = encrypt_file(tmp_path, key)  # dict: nonce/tag/ciphertext

        with open(enc_path, "wb") as f_out:
            f_out.write(encrypted["nonce"] + encrypted["tag"] + encrypted["ciphertext"])
        encrypted_size = os.path.getsize(enc_path)

        # cleanup tmp plaintext
        try:
            os.remove(tmp_path)
        except OSError:
            pass

        legacy_key_b64 = base64.b64encode(key).decode("utf-8")

        sf = SecureFile(
            id=file_uuid,
            original_filename=safe_name,
            storage_path=enc_path,
            mime_type=mime_type,
            sender_email=sender_email,
            recipient_email=recipient_email,
            expiry_time=expiry_dt,
            revoked=False,
            e2e=False,
            iv_b64=None,
            legacy_key_b64=legacy_key_b64,
            encrypted_size=encrypted_size,
        )
        db.add(sf)
        log_action(db, "UPLOAD_LEGACY", file_uuid, "SUCCESS", f"Sender={sender_email} Recipient={recipient_email}")
        db.commit()
        return jsonify(secure_file_to_dict(sf)), 201

    except Exception as e:
        db.rollback()
        # best-effort cleanup of enc_path if created
        try:
            if 'enc_path' in locals() and os.path.exists(enc_path):
                os.remove(enc_path)
        except OSError:
            pass
        return jsonify({"error": f"Upload failed: {e}"}), 500
    finally:
        db.close()


@app.route("/api/files", methods=["GET"])
def list_files():
    """List files filtered by sender or recipient email."""
    recipient_filter = request.args.get("recipient")
    sender_filter = request.args.get("sender")

    db: Session = SessionLocal()
    try:
        q = db.query(SecureFile)
        if recipient_filter:
            q = q.filter(SecureFile.recipient_email.ilike(recipient_filter))
        if sender_filter:
            q = q.filter(SecureFile.sender_email.ilike(sender_filter))
        q = q.order_by(SecureFile.created_at.desc())
        rows = q.all()
        return jsonify([secure_file_to_dict(r) for r in rows]), 200
    finally:
        db.close()


@app.route("/api/files/<file_id>/download", methods=["GET"])
def download_file(file_id: str):
    """Legacy download: server decrypts and returns plaintext.
    For E2E files this is disabled (client must use /raw + own key).
    """
    try:
        file_uuid = uuid.UUID(file_id)
    except ValueError:
        return jsonify({"error": "Bad file_id"}), 400

    db: Session = SessionLocal()
    try:
        sf = db.get(SecureFile, file_uuid)
        if not sf:
            return jsonify({"error": "Metadata not found"}), 404
        if sf.e2e:
            return jsonify({"error": "E2E file. Use /raw and client decrypt."}), 400

        now = datetime.now(timezone.utc)
        if now > sf.expiry_time:
            log_action(db, "DOWNLOAD", file_uuid, "FAILED", "Expired")
            db.commit()
            return jsonify({"error": "Access denied: File expired"}), 403
        if sf.revoked:
            log_action(db, "DOWNLOAD", file_uuid, "FAILED", "Revoked")
            db.commit()
            return jsonify({"error": "Access denied: File revoked"}), 403

        path = sf.storage_path
        if not os.path.exists(path):
            return jsonify({"error": "Encrypted file missing"}), 404

        with open(path, "rb") as f_in:
            content = f_in.read()
        nonce, tag, ciphertext = content[:16], content[16:32], content[32:]
        key = base64.b64decode(sf.legacy_key_b64 or b"")

        try:
            decrypted = decrypt_file(ciphertext, key, nonce, tag)
        except Exception as e:
            log_action(db, "DOWNLOAD", file_uuid, "FAILED", str(e))
            db.commit()
            return jsonify({"error": f"Decryption failed: {e}"}), 400

        log_action(db, "DOWNLOAD", file_uuid, "SUCCESS")
        db.commit()

        download_name = sf.original_filename or "download.bin"
        return send_file(io.BytesIO(decrypted), as_attachment=True, download_name=download_name)

    finally:
        db.close()


@app.route("/api/files/<file_id>/raw", methods=["GET"])
def download_raw_ciphertext(file_id: str):
    """Return the encrypted blob exactly as stored.
    Used by vendor browser to decrypt E2E files; works for legacy too.
    """
    try:
        file_uuid = uuid.UUID(file_id)
    except ValueError:
        return jsonify({"error": "Bad file_id"}), 400

    db: Session = SessionLocal()
    try:
        sf = db.get(SecureFile, file_uuid)
        if not sf:
            return jsonify({"error": "Metadata not found"}), 404

        now = datetime.now(timezone.utc)
        if now > sf.expiry_time:
            log_action(db, "RAW", file_uuid, "FAILED", "Expired")
            db.commit()
            return jsonify({"error": "Access denied: File expired"}), 403
        if sf.revoked:
            log_action(db, "RAW", file_uuid, "FAILED", "Revoked")
            db.commit()
            return jsonify({"error": "Access denied: File revoked"}), 403

        path = sf.storage_path
        if not os.path.exists(path):
            return jsonify({"error": "Encrypted file missing"}), 404

        log_action(db, "RAW", file_uuid, "SUCCESS")
        db.commit()
        return send_file(
            path,
            as_attachment=True,
            download_name=os.path.basename(path),
            mimetype="application/octet-stream",
        )
    finally:
        db.close()


@app.route("/api/files/<file_id>/revoke", methods=["POST"])
def revoke_file(file_id: str):
    try:
        file_uuid = uuid.UUID(file_id)
    except ValueError:
        return jsonify({"error": "Bad file_id"}), 400

    db: Session = SessionLocal()
    try:
        sf = db.get(SecureFile, file_uuid)
        if not sf:
            return jsonify({"error": "Metadata not found"}), 404
        if sf.revoked:
            return jsonify({"message": "Already revoked", "file_id": file_id}), 200

        sf.revoked = True
        log_action(db, "REVOKE", file_uuid, "SUCCESS")
        db.commit()
        return jsonify({"message": "File revoked", "file_id": file_id}), 200
    finally:
        db.close()


@app.route("/api/logs", methods=["GET"])
def get_logs():
    db: Session = SessionLocal()
    try:
        rows = db.query(FileAuditLog).order_by(FileAuditLog.timestamp.desc()).limit(500).all()
        out = []
        for r in rows:
            out.append({
                "id": r.id,
                "file_id": str(r.file_id) if r.file_id else None,
                "action": r.action,
                "status": r.status,
                "details": r.details,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            })
        return jsonify(out), 200
    finally:
        db.close()


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    # Ensure upload dir exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    app.run(host="0.0.0.0", port=5000, debug=True)
