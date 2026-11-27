# iLook Product Features & Version Roadmap

This document tracks all completed features, active build releases, and the upcoming roadmap for the **iLook Commercial Cloud Video Platform**.

Whenever a new feature is merged, bump the version here and in `frontend/src/config/version.json`. The version and feature history will automatically reflect in the application footer and "What's New" popup across all devices.

---

## Current Production Release: `v1.0.0` (Build 20261127.1)
*Release Date: November 27, 2026* • *Codename: iLook Genesis*

### Key Features Delivered in v1.0.0:
- [x] **Sub-Second Low-Latency Streaming:** Native browser **WebRTC (WHEP)** video playback with <500ms latency.
- [x] **Zero-Port-Forwarding Edge Push:** Lightweight Python + FFmpeg agent runs inside customer LAN and initiates outbound RTSP over TCP (`8554/tcp`) to `stream.labstackops.top`. No router port forwarding or UPnP required.
- [x] **Automatic ONVIF Local Discovery:** Edge agent broadcasts WS-Discovery probes to automatically locate IP cameras across local subnets.
- [x] **6-Digit Secure Node Pairing:** Frictionless pairing flow between customer web dashboard and local edge agent using ephemeral 6-digit codes.
- [x] **Strict Multi-Tenant Security Model:** Every camera feed is bound to `owner_user_id`. MediaMTX HTTP webhook authenticates every RTSP publish and WebRTC read. Users cannot access feeds across tenant boundaries.
- [x] **Next.js 14 Video Wall:** Responsive dark-mode dashboard with dynamic grid layout switcher (1x1 Focus, 2x2 Grid, 3x3 Wall), live latency HUD, and automatic ICE stream reconnection.
- [x] **Dual-Plane Architecture:**
  - Control Plane: `https://ilook.labstackops.top` via Cloudflare Zero Trust Tunnel (zero exposed web ports).
  - Media Plane: `https://stream.labstackops.top` (direct DNS with Let's Encrypt SSL, TCP 8554, UDP 8189).
- [x] **ARM64 Native Optimization:** Multi-stage Docker builds tuned for Oracle Cloud Infrastructure (OCI) Ampere A1 ARM64 running K3s.

---

## Upcoming Feature Roadmap

### `v1.1.0` (Planned) — Cloud Recording & Playback (HLS / MP4)
- [ ] 24/7 continuous cloud DVR storage in S3 / OCI Object Storage.
- [ ] Motion-triggered event clips with thumbnail generation.
- [ ] Interactive timeline scrubber in Next.js web dashboard.

### `v1.2.0` (Planned) — Edge AI & Computer Vision
- [ ] Person, vehicle, and pet detection at edge before uploading.
- [ ] Real-time Telegram and Web Push alert notifications.
- [ ] Two-way audio talkback (browser mic to camera speaker over WebRTC).

### `v1.3.0` (Planned) — Camera PTZ & Hardware Control
- [ ] Web-based pan-tilt-zoom (PTZ) controls over ONVIF.
- [ ] Camera reboot, snapshot, and firmware status reporting.

---

## How to Add a New Feature to the App

1. Add your feature entry to `frontend/src/config/version.json`:
   ```json
   {
     "version": "1.1.0",
     "build": "20261215.1",
     "title": "Cloud DVR & Timeline Scrubber",
     "highlights": [
       "Added 24/7 continuous recording",
       "Added timeline scrubber component"
     ]
   }
   ```
2. Re-run `./deploy.sh`.
3. The new build version and feature changelog will immediately appear in the footer of `https://ilook.labstackops.top`.
