import urllib.parse
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Camera, User
from app.schemas import MediaMTXAuthRequest, MediaMTXEventNotification

router = APIRouter(prefix="/mediamtx", tags=["mediamtx"])

def clean_path(path: str) -> str:
    """Normalize path by stripping leading/trailing slashes and query params."""
    p = path.strip("/")
    if "/" in p:
        p = p.split("/")[0]
    return p

@router.post("/auth")
def mediamtx_authenticate(
    req: MediaMTXAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Hook called by MediaMTX for EVERY stream publish and read.
    Returns HTTP 200 OK to allow, HTTP 401 to deny.
    
    Strict Multi-Tenant Security (Hik-Connect / gCMOB isolation model):
    1. Ingestion (action=publish):
       Edge agent publishes RTSP stream to CAM_<uid>.
       Must match cam_uid and cam_secret in PostgreSQL.
    2. Playback (action=read):
       WHEP client plays stream. Must pass signed JWT token in query string:
       ?token=<JWT>
       The JWT must prove ownership of this specific camera.
    """
    clean_uid = clean_path(req.path)

    # Allow health-check or metrics path if configured
    if clean_uid in ["health", "metrics", "ready"]:
        return Response(status_code=200)

    camera = db.query(Camera).filter(Camera.cam_uid == clean_uid).first()
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail=f"Camera with UID {clean_uid} does not exist"
        )

    # 1. PUBLISH (Edge agent pushing RTSP feed)
    if req.action == "publish":
        # Password passed by RTSP client in rtsp://user:pass@host:8554/path
        if req.password != camera.cam_secret:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid camera credentials for RTSP publishing"
            )
        # Mark camera online
        camera.is_online = True
        camera.last_seen = datetime.utcnow()
        db.commit()
        return Response(status_code=200)

    # 2. READ (WHEP WebRTC player or RTSP playback client)
    elif req.action == "read":
        # Extract JWT token from query string or password
        token = None
        if req.query:
            query_params = urllib.parse.parse_qs(req.query)
            token_list = query_params.get("token")
            if token_list:
                token = token_list[0]
        
        if not token and req.password:
            token = req.password
            
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authentication token for stream playback"
            )

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id: str = payload.get("sub")
            token_cam_uid: str = payload.get("cam_uid")
            token_type: str = payload.get("type", "playback")

            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token payload")

            # Check camera ownership
            if camera.owner_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-tenant access forbidden. You do not own this camera."
                )

            # If token is camera-specific, verify it matches the path
            if token_cam_uid and token_cam_uid != camera.cam_uid:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Token not valid for this camera UID"
                )

            return Response(status_code=200)

        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Expired or tampered playback JWT"
            )

    raise HTTPException(status_code=400, detail=f"Unsupported action: {req.action}")

@router.post("/event")
def mediamtx_event_hook(
    event: MediaMTXEventNotification,
    db: Session = Depends(get_db)
):
    """
    Hook triggered by MediaMTX runOnReady / runOnNotReady scripts
    to track stream online/offline status in real time.
    """
    clean_uid = clean_path(event.path)
    camera = db.query(Camera).filter(Camera.cam_uid == clean_uid).first()
    if camera:
        if event.type == "ready":
            camera.is_online = True
            camera.last_seen = datetime.utcnow()
        elif event.type == "notReady":
            camera.is_online = False
        db.commit()
    return {"status": "received"}
