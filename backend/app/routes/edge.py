import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, EdgeNode, Camera, PairingCode
from app.schemas import (
    PairingGenerateRequest, PairingGenerateResponse,
    PairingClaimRequest, PairingClaimResponse,
    EdgeHeartbeat, EdgeRegisterCamera, EdgeRegisterCameraResponse
)
from app.routes.auth import get_current_user
from app.security import (
    generate_pairing_code, generate_secret_key, 
    generate_cam_uid
)

router = APIRouter(prefix="/edge", tags=["edge"])

def get_current_edge_node(
    x_node_token: str = Header(..., alias="X-Node-Token"),
    db: Session = Depends(get_db)
) -> EdgeNode:
    node = db.query(EdgeNode).filter(EdgeNode.node_token == x_node_token).first()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired edge node token"
        )
    return node

@router.post("/pair/generate", response_model=PairingGenerateResponse)
def generate_pair_code(
    req: PairingGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """User generates a 6-digit code in web UI to pair their local edge agent."""
    code = generate_pairing_code()
    # Check uniqueness
    while db.query(PairingCode).filter(PairingCode.code == code, PairingCode.is_claimed == False).first():
        code = generate_pairing_code()

    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    pairing = PairingCode(
        code=code,
        user_id=current_user.id,
        node_name=req.node_name,
        expires_at=expires_at,
        is_claimed=False
    )
    db.add(pairing)
    db.commit()
    return PairingGenerateResponse(code=code, expires_at=expires_at)

@router.get("/pair/status/{code}")
def check_pairing_status(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dashboard UI polls this to detect when local agent finishes pairing."""
    pairing = db.query(PairingCode).filter(
        PairingCode.code == code, 
        PairingCode.user_id == current_user.id
    ).first()
    
    if not pairing:
        raise HTTPException(status_code=404, detail="Pairing code not found")
        
    return {
        "code": code,
        "is_claimed": pairing.is_claimed,
        "claimed_node_id": pairing.claimed_node_id,
        "is_expired": datetime.datetime.utcnow() > pairing.expires_at
    }

@router.post("/pair/claim", response_model=PairingClaimResponse)
def claim_pairing_code(
    claim_req: PairingClaimRequest,
    db: Session = Depends(get_db)
):
    """Edge agent calls this with the 6-digit code shown in user's browser."""
    pairing = db.query(PairingCode).filter(
        PairingCode.code == claim_req.code,
        PairingCode.is_claimed == False
    ).first()

    if not pairing:
        raise HTTPException(status_code=400, detail="Invalid or already claimed pairing code")

    if datetime.datetime.utcnow() > pairing.expires_at:
        raise HTTPException(status_code=400, detail="Pairing code has expired. Please generate a new one.")

    node_token = generate_secret_key(48)
    node_name = claim_req.node_name or pairing.node_name
    
    edge_node = EdgeNode(
        owner_id=pairing.user_id,
        node_name=node_name,
        node_token=node_token,
        version=claim_req.version or "1.0.0",
        is_online=True,
        last_heartbeat=datetime.datetime.utcnow()
    )
    db.add(edge_node)
    db.flush()

    pairing.is_claimed = True
    pairing.claimed_node_id = edge_node.id
    db.commit()
    db.refresh(edge_node)

    return PairingClaimResponse(
        edge_node_id=edge_node.id,
        node_token=node_token,
        owner_id=edge_node.owner_id
    )

@router.post("/heartbeat")
def edge_heartbeat(
    payload: EdgeHeartbeat,
    edge_node: EdgeNode = Depends(get_current_edge_node),
    db: Session = Depends(get_db)
):
    """Edge agent sends periodic heartbeat."""
    edge_node.is_online = True
    edge_node.last_heartbeat = datetime.datetime.utcnow()
    if payload.version:
        edge_node.version = payload.version
    if payload.ip_address:
        edge_node.ip_address = payload.ip_address
    db.commit()
    return {"status": "ok", "server_time": datetime.datetime.utcnow().isoformat()}

@router.post("/cameras/register", response_model=EdgeRegisterCameraResponse)
def register_camera_from_edge(
    cam_in: EdgeRegisterCamera,
    edge_node: EdgeNode = Depends(get_current_edge_node),
    db: Session = Depends(get_db)
):
    """Edge agent registers a discovered ONVIF or configured RTSP camera."""
    cam_uid = generate_cam_uid()
    cam_secret = generate_secret_key(32)

    camera = Camera(
        owner_id=edge_node.owner_id,
        edge_node_id=edge_node.id,
        cam_uid=cam_uid,
        cam_secret=cam_secret,
        name=cam_in.name,
        onvif_ip=cam_in.onvif_ip,
        onvif_port=cam_in.onvif_port,
        rtsp_source_url=cam_in.rtsp_source_url,
        is_online=False
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)

    rtsp_push_url = f"rtsp://{cam_uid}:{cam_secret}@{settings.MEDIAMTX_INGEST_HOST}:{settings.MEDIAMTX_INGEST_RTSP_PORT}/{cam_uid}"

    return EdgeRegisterCameraResponse(
        camera_id=camera.id,
        cam_uid=cam_uid,
        cam_secret=cam_secret,
        rtsp_push_url=rtsp_push_url
    )

@router.get("/nodes")
def list_user_edge_nodes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    nodes = db.query(EdgeNode).filter(EdgeNode.owner_id == current_user.id).all()
    return nodes
