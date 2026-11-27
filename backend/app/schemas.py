from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# User Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None

class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenPayload(BaseModel):
    sub: str
    exp: int

# Camera Schemas
class CameraCreateDirect(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    rtsp_source_url: Optional[str] = None

class CameraOut(BaseModel):
    id: str
    cam_uid: str
    name: str
    is_online: bool
    edge_node_id: Optional[str] = None
    rtsp_source_url: Optional[str] = None
    last_seen: Optional[datetime] = None
    created_at: datetime
    # URLs returned to client
    whep_url: str
    rtsp_push_url: str

    class Config:
        from_attributes = True

class CameraPlaybackAuth(BaseModel):
    cam_uid: str
    stream_token: str
    whep_url: str

# Edge Node & Pairing Schemas
class PairingGenerateRequest(BaseModel):
    node_name: str = "Local Edge Node"

class PairingGenerateResponse(BaseModel):
    code: str
    expires_at: datetime

class PairingClaimRequest(BaseModel):
    code: str
    node_name: Optional[str] = None
    version: Optional[str] = "1.0.0"

class PairingClaimResponse(BaseModel):
    edge_node_id: str
    node_token: str
    owner_id: str

class EdgeHeartbeat(BaseModel):
    version: Optional[str] = None
    ip_address: Optional[str] = None

class EdgeRegisterCamera(BaseModel):
    name: str
    onvif_ip: Optional[str] = None
    onvif_port: Optional[int] = 80
    rtsp_source_url: str

class EdgeRegisterCameraResponse(BaseModel):
    camera_id: str
    cam_uid: str
    cam_secret: str
    rtsp_push_url: str

# MediaMTX Webhook Schemas
class MediaMTXAuthRequest(BaseModel):
    ip: Optional[str] = None
    user: Optional[str] = ""
    password: Optional[str] = ""
    path: str
    protocol: Optional[str] = "rtsp"
    id: Optional[str] = None
    action: str  # "publish" or "read"
    query: Optional[str] = ""

class MediaMTXEventNotification(BaseModel):
    type: str # "ready" or "notReady"
    path: str
