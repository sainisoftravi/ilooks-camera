import secrets
import string
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from app.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_stream_playback_token(user_id: str, cam_uid: str, duration_minutes: int = 1440) -> str:
    """Generate short-lived or session-based stream playback token."""
    expire = datetime.utcnow() + timedelta(minutes=duration_minutes)
    to_encode = {
        "sub": user_id,
        "cam_uid": cam_uid,
        "type": "playback",
        "exp": expire
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def generate_cam_uid() -> str:
    """Generate cryptographically unique camera UID (e.g. CAM_8a9f2b1c4e)."""
    random_hex = secrets.token_hex(8)
    return f"CAM_{random_hex}"

def generate_secret_key(length: int = 32) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))

def generate_pairing_code() -> str:
    """Generate 6-character human-friendly numeric code."""
    return "".join(secrets.choice(string.digits) for _ in range(6))
