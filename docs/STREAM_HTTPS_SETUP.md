# Enabling HTTPS on stream.labstackops.top

Because your web dashboard is on HTTPS (`https://ilook.labstackops.top`), modern web browsers require the WebRTC WHEP stream signaling endpoint (`https://stream.labstackops.top/<CAM_UID>/whep`) to also be on **HTTPS** to prevent Mixed Content security blocking.

We have configured **K3s Traefik** to terminate HTTPS on standard port **443** for `stream.labstackops.top` and route the WHEP request to MediaMTX internally.

---

## 1-Minute Setup: Free Cloudflare 15-Year SSL Certificate

The easiest, most permanent solution that never expires:

1. Open your **Cloudflare Dashboard** > Select `labstackops.top`.
2. In the left sidebar, click **SSL/TLS** > **Origin Server**.
3. Click **Create Certificate**:
   - **Key type:** RSA (2048)
   - **Hostnames:** `*.labstackops.top`, `labstackops.top`
   - **Certificate Validity:** 15 years
4. Click **Create**.
5. You will see two boxes:
   - **Origin Certificate** (copy all text including `-----BEGIN CERTIFICATE-----`)
   - **Private Key** (copy all text including `-----BEGIN PRIVATE KEY-----`)

---

## Create the K3s TLS Secret on Your Oracle Server

SSH into your Oracle instance and save the files:

```bash
# 1. Paste the Origin Certificate into cert.pem
cat << 'EOF' > cert.pem
-----BEGIN CERTIFICATE-----
...paste your certificate here...
-----END CERTIFICATE-----
EOF

# 2. Paste the Private Key into key.pem
cat << 'EOF' > key.pem
-----BEGIN PRIVATE KEY-----
...paste your private key here...
-----END PRIVATE KEY-----
EOF

# 3. Create the TLS Secret in K3s:
sudo k3s kubectl create secret tls stream-tls \
  --cert=cert.pem \
  --key=key.pem \
  -n ilook-system

# Clean up local pem files
rm -f cert.pem key.pem
```

---

## How It Works

```
Browser (WebRTC WHEP Client)
   │
   ▼ HTTPS (port 443) -> https://stream.labstackops.top/<CAM_UID>/whep
[ K3s Traefik Ingress (Terminates SSL via stream-tls) ]
   │
   ▼ Internal Cluster HTTP (port 8889)
[ MediaMTX Gateway (Returns SDP Answer) ]
   │
   ▼ Direct UDP (port 8189)
[ Live Camera Video Stream over WebRTC ]
```

- **Clean URL**: `https://stream.labstackops.top` (no weird ports like `:8889` needed).
- **Zero Mixed Content Errors**: Frontend and Media plane are both 100% HTTPS.
- **RTSP Ingest**: Cameras and edge agents still push directly to `rtsp://stream.labstackops.top:8554/<CAM_UID>`.
