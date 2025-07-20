from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from database.database import Base
from sqlalchemy.orm import relationship

class SecureFile(Base):
    __tablename__ = "secure_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(Text, nullable=False)       
    mime_type = Column(String(255))
    sender_email = Column(String(255), nullable=False)
    recipient_email = Column(String(255), nullable=False)
    expiry_time = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False)
    e2e = Column(Boolean, default=False)
    iv_b64 = Column(Text)
    legacy_key_b64 = Column(Text)
    encrypted_size = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now(), server_default=func.now())

    logs = relationship("FileAuditLog", back_populates="file")

class FileAuditLog(Base):
    __tablename__ = "file_audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    file_id = Column(UUID(as_uuid=True), ForeignKey("secure_files.id"))
    action = Column(String(50))
    status = Column(String(20))
    details = Column(Text)
    timestamp = Column(DateTime, server_default=func.now())

    file = relationship("SecureFile", back_populates="logs")
