from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Camera, User
from app.schemas import CameraCreateDirect, CameraOut, CameraPlaybackAuth
from app.routes.auth import get_current_user
from app.security import (
    generate_cam_uid, 
    generate_secret_key, 
    create_stream_playback_token
)

router = APIRouter(prefix="/cameras", tags=["cameras"])

def format_camera_response(cam: Camera) -> CameraOut:
    # Build RTSP Push URL and WHEP Playback URL
    push_url = f"rtsp://{cam.cam_uid}:{cam.cam_secret}@{settings.MEDIAMTX_INGEST_HOST}:{settings.MEDIAMTX_INGEST_RTSP_PORT}/{cam.cam_uid}"
    whep_url = f"{settings.MEDIAMTX_WHEP_URL}/{cam.cam_uid}/whep"
    
    return CameraOut(
        id=cam.id,
        cam_uid=cam.cam_uid,
        name=cam.name,
        is_online=cam.is_online,
        edge_node_id=cam.edge_node_id,
        rtsp_source_url=cam.rtsp_source_url,
        last_seen=cam.last_seen,
        created_at=cam.created_at,
        whep_url=whep_url,
        rtsp_push_url=push_url
    )

@router.get("", response_model=List[CameraOut])
def list_cameras(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cameras = db.query(Camera).filter(Camera.owner_id == current_user.id).order_by(Camera.created_at.desc()).all()
    return [format_camera_response(c) for c in cameras]

@router.post("/direct", response_model=CameraOut)
def create_direct_camera(
    cam_in: CameraCreateDirect,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register camera manually (e.g. factory UID or manual RTSP stream)."""
    cam_uid = generate_cam_uid()
    cam_secret = generate_secret_key(32)
    
    camera = Camera(
        owner_id=current_user.id,
        cam_uid=cam_uid,
        cam_secret=cam_secret,
        name=cam_in.name,
        rtsp_source_url=cam_in.rtsp_source_url,
        is_online=False
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return format_camera_response(camera)

@router.get("/{cam_id}", response_model=CameraOut)
def get_camera(
    cam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    camera = db.query(Camera).filter(Camera.id == cam_id, Camera.owner_id == current_user.id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found or unauthorized")
    return format_camera_response(camera)

@router.get("/{cam_id}/playback", response_model=CameraPlaybackAuth)
def get_playback_token(
    cam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate an ephemeral signed WebRTC playback token ensuring strict multi-tenant isolation.
    MediaMTX /auth webhook will verify this token and verify ownership.
    """
    camera = db.query(Camera).filter(Camera.id == cam_id, Camera.owner_id == current_user.id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found or unauthorized")
        
    token = create_stream_playback_token(current_user.id, camera.cam_uid, duration_minutes=1440)
    whep_endpoint = f"{settings.MEDIAMTX_WHEP_URL}/{camera.cam_uid}/whep?token={token}"
    
    return CameraPlaybackAuth(
        cam_uid=camera.cam_uid,
        stream_token=token,
        whep_url=whep_endpoint
    )

@router.delete("/{cam_id}")
def delete_camera(
    cam_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    camera = db.query(Camera).filter(Camera.id == cam_id, Camera.owner_id == current_user.id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found or unauthorized")
    db.delete(camera)
    db.commit()
    return {"status": "success", "message": f"Camera {cam_id} deleted"}
