from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from sqlalchemy.orm import Session

from database.database import SessionLocal
from database.models import SecureFile, FileAuditLog


# config
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # For demo; tighten in prod

UPLOAD_DIR = os.path.abspath(os.getenv("UPLOAD_FOLDER", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

DEFAULT_EXPIRY_MINUTES = int(os.getenv("FILE_EXPIRY_MINUTES", "10"))

# Helpers
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


# Routes

@app.route("/api/files", methods=["POST"])
def upload_file():
   
    db: Session = SessionLocal()
    try:
        file = request.files.get("file")
        recipient_email = request.form.get("recipient_email")
        sender_email = request.form.get("sender_email")
        iv_b64 = request.form.get("iv_b64")
        mime_type = request.form.get("mime_type") or "application/octet-stream"
        original_filename = request.form.get("original_name")

        if not file:
            return jsonify({"error": "No file uploaded"}), 400
        if not recipient_email:
            return jsonify({"error": "Missing recipient_email"}), 400
        if not sender_email:
            return jsonify({"error": "Missing sender_email"}), 400
        if not iv_b64:
            return jsonify({"error": "Missing iv_b64 for E2E encryption"}), 400

        file_uuid = uuid.uuid4()
        safe_name = secure_filename(original_filename or file.filename or "upload.bin")
        enc_path = os.path.join(UPLOAD_DIR, f"{file_uuid}.bin")

        expiry_dt = datetime.now(timezone.utc) + timedelta(minutes=DEFAULT_EXPIRY_MINUTES)

        # Save ciphertext as-is
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
            encrypted_size=encrypted_size,
        )
        db.add(sf)
        log_action(db, "UPLOAD_E2E", file_uuid, "SUCCESS", f"Sender={sender_email} Recipient={recipient_email}")
        db.commit()
        return jsonify(secure_file_to_dict(sf)), 201

    except Exception as e:
        db.rollback()
        return jsonify({"error": f"Upload failed: {e}"}), 500
    finally:
        db.close()

@app.route("/api/files", methods=["GET"])
def list_files():
    
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

@app.route("/api/files/<file_id>/raw", methods=["GET"])
def download_raw_ciphertext(file_id: str):
    
    try:
        file_uuid = uuid.UUID(file_id)
    except ValueError:
        return jsonify({"error": "Bad file_id"}), 400

    db: Session = SessionLocal()
    try:
        sf = db.get(SecureFile, file_uuid)
        if not sf:
            return jsonify({"error": "Metadata not found"}), 404

        now_epoch = datetime.now(timezone.utc).timestamp()
        exp_epoch = sf.expiry_time.timestamp() if sf.expiry_time else 0

        if now_epoch > exp_epoch:
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
            download_name=os.path.basename(sf.original_filename or path),
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

@app.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    db: Session = SessionLocal()
    try:
        files = db.query(SecureFile).order_by(SecureFile.created_at.desc()).all()
        data = []
        for file in files:
            data.append({
                "id": str(file.id),
                "filename": file.original_filename,
                "sender_email": file.sender_email,
                "recipient_email": file.recipient_email,
                "expiry_time": file.expiry_time.isoformat() if file.expiry_time else None,
                "revoked": file.revoked,
                "encrypted_size": file.encrypted_size,
                "created_at": file.created_at.isoformat() if file.created_at else None,
                "logs": [
                    {
                        "action": log.action,
                        "status": log.status,
                        "details": log.details,
                        "timestamp": log.timestamp.isoformat()
                    }
                    for log in file.logs
                ]
            })
        return jsonify({"files": data}), 200
    finally:
        db.close()


# Main
if __name__ == "__main__":
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    app.run(host="0.0.0.0", port=5000, debug=True)
