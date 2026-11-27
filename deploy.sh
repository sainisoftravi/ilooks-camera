#!/bin/bash
set -e

# ==============================================================================
#  iLook Commercial Cloud Video Platform - All-in-One K3s Deployment Script
#  Target: Oracle Cloud Infrastructure (OCI) Ampere A1 ARM64 (Ubuntu + K3s)
# ==============================================================================

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}========================================================================${NC}"
echo -e "${BLUE}${BOLD}   Starting iLook Commercial Video Platform Deployment (K3s ARM64)     ${NC}"
echo -e "${BLUE}${BOLD}========================================================================${NC}"

# ------------------------------------------------------------------------------
# 1. Environment & CLI Discovery
# ------------------------------------------------------------------------------
if command -v k3s &> /dev/null; then
    KUBECTL_CMD="sudo k3s kubectl"
elif command -v kubectl &> /dev/null; then
    KUBECTL_CMD="kubectl"
else
    echo -e "${RED}[ERROR] Neither 'k3s' nor 'kubectl' command found!${NC}"
    exit 1
fi
echo -e "${GREEN}[✓] Using Kubernetes CLI: ${KUBECTL_CMD}${NC}"

# ------------------------------------------------------------------------------
# 2. Host Firewall Setup (Ubuntu iptables on OCI)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}--> Step 1: Checking and configuring host firewall rules...${NC}"
for PORT in "8554:tcp" "8889:tcp" "8189:udp" "443:tcp"; do
    NUM=$(echo $PORT | cut -d: -f1)
    PROTO=$(echo $PORT | cut -d: -f2)
    if ! sudo iptables -C INPUT -p $PROTO --dport $NUM -j ACCEPT 2>/dev/null; then
        echo -e "    Opening port ${NUM}/${PROTO} in iptables..."
        sudo iptables -I INPUT 1 -p $PROTO --dport $NUM -j ACCEPT
    else
        echo -e "    Port ${NUM}/${PROTO} is already open."
    fi
done

if command -v netfilter-persistent &> /dev/null; then
    sudo netfilter-persistent save >/dev/null 2>&1 || true
fi
echo -e "${GREEN}[✓] Host firewall configured.${NC}"

# ------------------------------------------------------------------------------
# 3. Namespace & SSL Certificate Setup (Let's Encrypt / stream-tls)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}--> Step 2: Ensuring namespace and SSL certificate in K3s...${NC}"
$KUBECTL_CMD create namespace ilook-system --dry-run=client -o yaml | $KUBECTL_CMD apply -f -

CERT_PATH="/etc/letsencrypt/live/stream.labstackops.top/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/stream.labstackops.top/privkey.pem"

if sudo test -f "$CERT_PATH" && sudo test -f "$KEY_PATH"; then
    echo -e "    Detected Let's Encrypt certificates at ${CERT_PATH}"
    sudo k3s kubectl create secret tls stream-tls \
        --cert="$CERT_PATH" \
        --key="$KEY_PATH" \
        -n ilook-system \
        --dry-run=client -o yaml | $KUBECTL_CMD apply -f -
    echo -e "${GREEN}[✓] 'stream-tls' secret synchronized with K3s.${NC}"
else
    echo -e "${YELLOW}[!] Note: Certbot certificate not found at ${CERT_PATH}.${NC}"
    echo -e "    If not yet generated, Traefik will use fallback or self-signed cert."
fi

# ------------------------------------------------------------------------------
# 4. Build Docker Images (Native ARM64)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}--> Step 3: Building & caching ARM64 Docker images...${NC}"
echo -e "    Pulling and caching MediaMTX (official bluenviron/mediamtx:1-ffmpeg)..."
docker pull bluenviron/mediamtx:1-ffmpeg

echo -e "    Building Backend (FastAPI + SQLAlchemy)..."
docker build --no-cache -t ilook-backend:latest ./backend

echo -e "    Building Frontend (Next.js 14 App Router + Tailwind)..."
docker build -t ilook-frontend:latest ./frontend

# ------------------------------------------------------------------------------
# 5. Import Images into K3s Containerd (k8s.io namespace)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}--> Step 4: Importing images into K3s containerd (k8s.io namespace)...${NC}"
if command -v k3s &> /dev/null; then
    docker save bluenviron/mediamtx:1-ffmpeg | sudo k3s ctr -n k8s.io images import -
    docker save ilook-backend:latest | sudo k3s ctr -n k8s.io images import -
    docker save ilook-frontend:latest | sudo k3s ctr -n k8s.io images import -
    echo -e "${GREEN}[✓] Images cached in K3s containerd (k8s.io namespace).${NC}"
fi

# ------------------------------------------------------------------------------
# 6. Apply Kubernetes Manifests in Order
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}--> Step 5: Applying K3s manifests...${NC}"
$KUBECTL_CMD apply -f ./k8s/00-namespace.yaml
$KUBECTL_CMD apply -f ./k8s/01-secrets.yaml
$KUBECTL_CMD apply -f ./k8s/02-postgres.yaml

echo -e "    Waiting for PostgreSQL database to initialize..."
$KUBECTL_CMD rollout status statefulset/ilook-postgres -n ilook-system --timeout=120s

$KUBECTL_CMD apply -f ./k8s/03-mediamtx-config.yaml
$KUBECTL_CMD apply -f ./k8s/04-mediamtx.yaml
$KUBECTL_CMD apply -f ./k8s/05-backend.yaml
$KUBECTL_CMD apply -f ./k8s/06-frontend.yaml
$KUBECTL_CMD apply -f ./k8s/07-ingress.yaml

# Delete any lingering stuck pods from previous failed rollouts
$KUBECTL_CMD delete pod -l app=ilook-backend -n ilook-system --force --grace-period=0 2>/dev/null || true
$KUBECTL_CMD delete pod -l app=ilook-media-gateway -n ilook-system --force --grace-period=0 2>/dev/null || true

# ------------------------------------------------------------------------------
# 7. Rollout Health Checks
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}--> Step 6: Verifying service rollout status...${NC}"
$KUBECTL_CMD rollout status deployment/ilook-backend -n ilook-system --timeout=90s
$KUBECTL_CMD rollout status deployment/ilook-frontend -n ilook-system --timeout=90s
$KUBECTL_CMD rollout status deployment/ilook-media-gateway -n ilook-system --timeout=90s

echo -e "\n${BLUE}========================================================================${NC}"
echo -e "${GREEN}${BOLD}   DEPLOYMENT SUCCESSFUL! All iLook Microservices are Running.         ${NC}"
echo -e "${BLUE}========================================================================${NC}"
$KUBECTL_CMD get pods -n ilook-system -o wide

echo -e "\n${BOLD}Access Endpoints:${NC}"
echo -e "  • Web Dashboard & API : ${GREEN}https://ilook.labstackops.top${NC} (via Cloudflare Tunnel)"
echo -e "  • Media WebRTC (HTTPS): ${GREEN}https://stream.labstackops.top/CAM_UID/whep${NC}"
echo -e "  • Media RTSP Ingestion: ${GREEN}rtsp://stream.labstackops.top:8554/CAM_UID${NC}"
echo -e "  • Media WebRTC ICE UDP: ${GREEN}stream.labstackops.top:8189/udp${NC}"

echo -e "\n${YELLOW}To run a local edge agent on your customer LAN:${NC}"
echo -e "  docker run -d --restart=always --network=host \\"
echo -e "    -e PAIRING_CODE=\"<6-DIGIT-CODE>\" \\"
echo -e "    -e CLOUD_URL=\"https://ilook.labstackops.top\" \\"
echo -e "    ilook/edge-agent:latest"
echo -e "========================================================================\n"
