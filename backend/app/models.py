import datetime
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    cameras = relationship("Camera", back_populates="owner", cascade="all, delete-orphan")
    edge_nodes = relationship("EdgeNode", back_populates="owner", cascade="all, delete-orphan")


class EdgeNode(Base):
    __tablename__ = "edge_nodes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    node_name = Column(String(100), nullable=False)
    node_token = Column(String(64), unique=True, index=True, nullable=False)
    ip_address = Column(String(64), nullable=True)
    version = Column(String(32), nullable=True)
    is_online = Column(Boolean, default=False)
    last_heartbeat = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="edge_nodes")
    cameras = relationship("Camera", back_populates="edge_node")


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    edge_node_id = Column(String(36), ForeignKey("edge_nodes.id", ondelete="SET NULL"), nullable=True)
    
    # Cryptographically unique Camera UID used for MediaMTX dynamic path CAM_<uid>
    cam_uid = Column(String(64), unique=True, index=True, nullable=False)
    # MediaMTX RTSP push password
    cam_secret = Column(String(64), nullable=False)
    
    name = Column(String(100), nullable=False)
    onvif_ip = Column(String(64), nullable=True)
    onvif_port = Column(Integer, default=80)
    rtsp_source_url = Column(String(512), nullable=True) # local RTSP feed URL on edge
    
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="cameras")
    edge_node = relationship("EdgeNode", back_populates="cameras")


class PairingCode(Base):
    __tablename__ = "pairing_codes"

    code = Column(String(6), primary_key=True, index=True) # 6-digit numeric or alphanumeric code
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    node_name = Column(String(100), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_claimed = Column(Boolean, default=False)
    claimed_node_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
