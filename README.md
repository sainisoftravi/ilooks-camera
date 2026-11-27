# iLook Commercial IP Camera Cloud Platform (Phase 1)

**iLook** is a production-ready, commercial-grade cloud video surveillance platform built for low-latency WebRTC streaming, multi-tenant camera isolation, and zero-port-forwarding outbound edge ingestion.

Designed specifically for **Oracle Cloud Infrastructure (OCI) Ampere A1 ARM64 (`aarch64`)** running **K3s (lightweight Kubernetes)**.

---

## 1. System Architecture

```
                                  [ User Browser ]
                                   /            \
           (HTTPS / WSS via Cloudflare Tunnel)   (Direct WHEP WebRTC / UDP)
                                 /                \
        https://ilook.labstackops.top     stream.labstackops.top:8889
                     |                                    |
              [ Cloudflare Tunnel ]                       |
                     |                                    |
            [ K3s Ingress (Traefik) ]                     |
              /                 \                         |
             /                   \                        |
  [ ilook-frontend ]    [ ilook-auth-service ]     [ ilook-media-gateway ]
     (Next.js 14)          (FastAPI + JWT)          (MediaMTX ARM64)
                                 |                 HostPorts: 8554, 8889, 8189
                            [ PostgreSQL ]                ^
                                                          |
                                           (Outbound RTSP Push over TCP)
                                                          |
                                                [ ilook-edge-agent ]
                                                (Customer Local LAN)
                                                Scans ONVIF / Local RTSP
```

---

## 2. Monorepo Structure

```
├── backend/                  # FastAPI Microservice (Python 3.11 ARM64)
│   ├── app/
│   │   ├── routes/
│   │   │   ├── auth.py       # JWT signup, login, session validation
│   │   │   ├── cameras.py    # Camera CRUD & ephemeral playback token generator
│   │   │   ├── edge.py       # 6-digit edge node pairing & registration
│   │   │   └── mediamtx.py   # MediaMTX HTTP webhook (publish & read validation)
│   │   ├── config.py         # App configuration & settings
│   │   ├── database.py       # SQLAlchemy engine & session pool
│   │   ├── models.py         # DB models (User, EdgeNode, Camera, PairingCode)
│   │   ├── schemas.py        # Pydantic v2 validation models
│   │   ├── security.py       # bcrypt hashing & cryptographic UID generators
│   │   └── main.py           # FastAPI entrypoint & CORS setup
│   ├── Dockerfile            # Multi-stage ARM64 Docker build
│   └── requirements.txt
│
├── frontend/                 # Next.js 14 App Router (React + Tailwind CSS)
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/    # Multi-camera live grid & management drawer
│   │   │   ├── login/        # Dark-mode Sign In / Sign Up UI
│   │   │   ├── layout.tsx    # Root layout & dark theme
│   │   │   └── page.tsx      # Auth redirect
│   │   ├── components/
│   │   │   ├── WhepPlayer.tsx       # Auto-reconnecting WHEP WebRTC player with stats
│   │   │   ├── AddCameraModal.tsx   # Dual onboarding (Direct RTSP + ONVIF scan)
│   │   │   └── PairEdgeModal.tsx    # 6-digit code generator & status poller
│   │   └── lib/
│   │       └── api.ts        # Type-safe API client
│   ├── Dockerfile            # Multi-stage standalone Next.js image
│   └── package.json
│
├── edge-agent/               # Customer LAN On-Prem Agent (Docker / Raspberry Pi)
│   ├── agent.py              # Supervisor, pairing flow & auto-discovery loop
│   ├── onvif_scanner.py      # WS-Discovery & ONVIF camera discovery
│   ├── stream_manager.py     # Outbound RTSP FFmpeg supervisor with backoff
│   ├── docker-compose.yml    # Host-network deployment
│   ├── Dockerfile            # ARM64 & AMD64 multi-arch image
│   └── requirements.txt
│
├── k8s/                      # Kubernetes (K3s) Manifests
│   ├── 00-namespace.yaml
│   ├── 01-secrets.yaml
│   ├── 02-postgres.yaml
│   ├── 03-mediamtx-config.yaml
│   ├── 04-mediamtx.yaml      # MediaMTX HostPort binding (8554, 8889, 8189)
│   ├── 05-backend.yaml
│   ├── 06-frontend.yaml
│   ├── 07-ingress.yaml       # Traefik routing
│   └── 08-cloudflared.yaml   # Cloudflare Tunnel integration
│
├── docs/
│   └── OCI_VCN_FIREWALL_SETUP.md # Oracle Cloud security lists & iptables fixes
└── deploy.sh                 # Single-command build & deployment script
```

---

## 3. Deployment Instructions (OCI K3s)

### Step 1: Clone Repository onto your OCI Instance
```bash
git clone <repo-url> /opt/ilook
cd /opt/ilook
```

### Step 2: Configure Oracle Cloud Security Lists & iptables
Follow [docs/OCI_VCN_FIREWALL_SETUP.md](file:///e:/CAMERA-ONLINE/docs/OCI_VCN_FIREWALL_SETUP.md) to open TCP `8554`, TCP `8889`, and UDP `8189`.

### Step 3: Run Deployment Script
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 4. Edge Agent Quick Start (Customer LAN)

Run on any Raspberry Pi, mini PC, or Docker host on the same local network as the IP cameras:

```bash
docker run -d --restart=always --network=host \
  -e PAIRING_CODE="<6-DIGIT-CODE>" \
  -e CLOUD_URL="https://ilook.labstackops.top" \
  ilook/edge-agent:latest
```

The agent claims the pairing code, stores credentials locally in `./data/config.json`, scans for ONVIF IP cameras, and automatically establishes an outbound RTSP push without touching the customer router!
