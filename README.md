# iLook Commercial IP Camera Cloud Platform (Phase 1)

<div align="center">
  <h3>Commercial Multi-Tenant Low-Latency WebRTC IP Camera Cloud Platform</h3>
  <p>Engineered for Oracle Cloud Infrastructure (OCI) Ampere A1 ARM64 & K3s Kubernetes</p>
</div>

---

## 1. Executive Summary & Core Mission

**iLook** is an enterprise-grade cloud video surveillance platform designed to compete with proprietary ecosystems like Hik-Connect, Dahua DMSS, and gCMOB. 

It provides:
- **Sub-500ms Ultra-Low Latency** live video streaming via native browser **WebRTC (WHEP)**.
- **Zero-Port-Forwarding Edge Ingestion** over outbound RTSP TCP.
- **Strict Multi-Tenant Security Isolation** ensuring users can never access or discover other tenants' cameras.
- **Automatic Local LAN Camera Discovery** using WS-Discovery & ONVIF.
- **Dynamic In-App Feature & Build Versioning** with live release notes in the dashboard footer.

---

## 2. Technical Architecture & Network Flow

```
                                      [ Customer Browser ]
                                        /              \
           (HTTPS via Cloudflare Zero Trust Tunnel)     (Direct HTTPS WHEP & UDP WebRTC)
                                      /                  \
                        https://ilook.labstackops.top    https://stream.labstackops.top
                                     |                                  |
                           [ Cloudflare Tunnel ]                        |
                                     |                                  |
                           [ K3s Ingress / Traefik ]                    |
                            /                  \                        |
                           /                    \                       |
              [ ilook-frontend ]        [ ilook-backend ]      [ ilook-media-gateway ]
                 (Next.js 14)            (FastAPI + JWT)          (MediaMTX ARM64)
                                                |              HostPorts: 8554, 8889, 8189
                                           [ PostgreSQL ]               ^
                                                                        |
                                                       (Outbound RTSP Push over TCP)
                                                                        |
                                                              [ ilook-edge-agent ]
                                                              (Customer Local LAN)
                                                          Scans ONVIF & Local RTSP Feeds
```

### Dual-Plane Network Separation:
1. **Control Plane (`https://ilook.labstackops.top`)**:
   - Routed via your **Cloudflare Zero Trust Tunnel (`cloudflared`)** directly into K3s Traefik.
   - **Zero ports exposed on Oracle Cloud** for the web application and API.
   - Cloudflare handles SSL termination, DDoS protection, and edge caching.
2. **Media Plane (`https://stream.labstackops.top`)**:
   - Direct DNS `A` record pointing to Oracle Public IP (**Grey Cloud / DNS Only**).
   - WHEP WebRTC signaling on **HTTPS (Port 443)** using a valid Let's Encrypt certificate.
   - Outbound RTSP Ingestion on **TCP 8554**.
   - Raw WebRTC Media Packets on **UDP 8189** without Cloudflare packet drops or buffer latency.

---

## 3. Technology Stack

| Layer | Component | Technologies & Frameworks | Description |
| :--- | :--- | :--- | :--- |
| **Compute / OS** | Infrastructure | **Oracle Cloud Ampere A1 (ARM64 / `aarch64`)** • Ubuntu 22.04 LTS | 4 OCPUs, 24GB RAM, high-bandwidth ARM64 cloud instance |
| **Orchestration** | Container Engine | **K3s (Lightweight Kubernetes)** + Traefik Ingress + Containerd | Single-binary production Kubernetes cluster optimized for edge/ARM |
| **Media Engine** | Streaming Core | **MediaMTX v1.9.0 (ARM64 native)** | High-concurrency RTSP & WebRTC WHEP media server with HTTP auth webhooks |
| **Backend** | Microservice | **Python 3.11** • **FastAPI** • **SQLAlchemy 2.0** • **Pydantic v2** | High-performance async REST API, token generator, and edge supervisor |
| **Database** | Persistence | **PostgreSQL 16 (StatefulSet)** + PersistentVolumeClaim | Multi-tenant user schema, encrypted camera secrets, edge pairing tokens |
| **Frontend** | Web Application | **Next.js 14 (App Router)** • **React 18** • **Tailwind CSS** | Responsive dark-mode video wall (1x1, 2x2, 3x3), WHEP WebRTC player |
| **Edge Agent** | Customer LAN | **Python 3.11** • **FFmpeg** • **WS-Discovery** • **Docker** | Containerized on-prem agent with auto ONVIF scan & self-healing RTSP push |
| **Security** | Auth & Encryption | **JWT (HS256)** • **bcrypt** • **Let's Encrypt SSL** • **Cloudflare Tunnel** | Cryptographically bound stream tokens, zero-trust perimeter |

---

## 4. End-to-End Installation & Deployment

### Step 1: Clone Repository on Your Oracle Server
```bash
git clone https://github.com/sainisoftravi/ilooks-camera.git
cd ilooks-camera
```

### Step 2: Route `ilook.labstackops.top` in Cloudflare Tunnel
In your **Cloudflare Zero Trust Dashboard** > **Networks** > **Tunnels** > Select your existing active tunnel > **Public Hostnames**:
- **Subdomain:** `ilook`
- **Domain:** `labstackops.top`
- **Service:** `HTTP` ➔ `localhost:80`
- **Additional Settings > HTTP Host Header:** `ilook.labstackops.top`

### Step 3: Run the All-in-One Deployment Script
```bash
chmod +x deploy.sh
./deploy.sh
```

The script automatically:
1. Detects your Let's Encrypt certificate at `/etc/letsencrypt/live/stream.labstackops.top/` and injects it into K3s as `stream-tls`.
2. Configures host `iptables` for ports `8554` (TCP), `8889` (TCP), `8189` (UDP), and `443` (TCP).
3. Builds the native ARM64 Docker images for Backend and Frontend.
4. Caches images in K3s containerd and deploys all manifests in sequence.
5. Performs rollout checks and displays the running pods.

---

## 5. Live Feature Tracking & Build Versioning

Every release and new feature is declared in [frontend/src/config/version.json](file:///e:/CAMERA-ONLINE/frontend/src/config/version.json) and [FEATURES.md](file:///e:/CAMERA-ONLINE/FEATURES.md).

### How the In-App Version Badge Works:
- The footer of `https://ilook.labstackops.top` dynamically displays the current version and build number:
  ```text
  iLook • Commercial Video Cloud • v1.0.0 (20261127.1) [What's New in v1.0.0] [K3s ARM64]
  ```
- Clicking **"What's New in v1.0.0"** opens an interactive modal displaying the full list of highlights, changes, and release dates.

### Adding a New Feature in Phase 2:
1. Add the feature description to `frontend/src/config/version.json`:
   ```json
   {
     "version": "1.1.0",
     "build": "20261201.1",
     "releaseDate": "2026-12-01",
     "features": [
       {
         "version": "1.1.0",
         "date": "2026-12-01",
         "title": "Cloud Recording & Playback",
         "highlights": [
           "24/7 continuous cloud DVR storage in S3",
           "Interactive timeline scrubber component",
           "Motion event thumbnail generation"
         ]
       }
     ]
   }
   ```
2. Run `./deploy.sh`.
3. The build version in the footer and the release notes modal update automatically across all user browsers!

---

## 6. Local Edge Agent Setup (Customer LAN)

Run on any Raspberry Pi, mini PC, or Docker host on the same local network as the customer's IP cameras:

```bash
docker run -d --restart=always --network=host \
  -e PAIRING_CODE="<6-DIGIT-CODE-FROM-DASHBOARD>" \
  -e CLOUD_URL="https://ilook.labstackops.top" \
  ilook/edge-agent:latest
```

The agent claims the pairing code, scans the LAN for ONVIF cameras, and initiates an outbound RTSP stream directly to `stream.labstackops.top:8554` without any customer router port forwarding.
