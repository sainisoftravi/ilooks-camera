# iLook Dual-Plane Networking Architecture (Cloudflare + OCI K3s)

## 1. Architectural Separation: Control Plane vs. Media Plane

| Plane | Subdomain | Cloudflare Proxy | Target Endpoint | Protocols & Ports | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Control / Web UI** | `ilook.labstackops.top` | **Orange Cloud (Proxied)** via **Cloudflare Tunnel (`cloudflared`)** | K3s Traefik / Frontend / FastAPI | HTTPS `443` (Tunnel outbound) | User Web Dashboard, JWT Auth, API endpoints. **Zero ports exposed on OCI**. |
| **Media Plane** | `stream.labstackops.top` | **Grey Cloud (DNS Only / Bypassed)** | **Direct OCI Public IP** | `8554/tcp` (RTSP Ingest)<br>`8889/tcp` (WHEP Signaling)<br>`8189/udp` (WebRTC ICE Media) | Ultra-low-latency RTSP ingestion and WebRTC WHEP streaming without Cloudflare buffering or UDP dropouts. |

---

## 2. Cloudflare DNS Settings

1. **`ilook.labstackops.top`**:
   - Type: `CNAME`
   - Content: `<tunnel-uuid>.cfargotunnel.com`
   - Proxy status: **Proxied (Orange Cloud)**
2. **`stream.labstackops.top`**:
   - Type: `A`
   - Content: `<YOUR_ORACLE_PUBLIC_IP>`
   - Proxy status: **DNS Only (Grey Cloud)** ⚠️ *Mandatory for RTSP TCP and WebRTC UDP packets to reach MediaMTX.*

---

## 3. Cloudflare Tunnel Ingress Config (`config.yml`)

```yaml
tunnel: <YOUR-TUNNEL-UUID>
credentials-file: /etc/cloudflared/<YOUR-TUNNEL-UUID>.json

ingress:
  # Route traffic to the K3s Traefik ingress controller inside the cluster
  - hostname: ilook.labstackops.top
    service: http://traefik.kube-system.svc.cluster.local:80
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```
