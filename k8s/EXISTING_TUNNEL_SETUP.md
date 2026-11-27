# Integrating iLook with Your Existing Cloudflare Tunnel on K3s

Because you already have a running Cloudflare Tunnel (`cloudflared`) on your Oracle server hosting other applications, **do NOT deploy a second tunnel**. 

Simply add **one routing rule** to your existing tunnel configuration. K3s has built-in **Traefik**, which is already listening on port 80/443 on your server.

---

## Option A: If your existing tunnel is managed via Cloudflare Zero Trust Dashboard (Web UI)

1. Go to the [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/).
2. Navigate to **Networks** > **Tunnels**.
3. Click on your **existing active tunnel** > **Configure**.
4. Go to the **Public Hostnames** tab and click **Add a public hostname**:
   - **Subdomain:** `ilook`
   - **Domain:** `labstackops.top`
   - **Path:** *(leave blank)*
   - **Type:** `HTTP`
   - **URL:** `localhost:80` *(or `127.0.0.1:80`)*
5. Expand **Additional application settings** > **HTTP Settings**:
   - **HTTP Host Header:** `ilook.labstackops.top`
6. Click **Save Hostname**.

That's it! Cloudflare will immediately route `https://ilook.labstackops.top` through your existing tunnel to K3s Traefik, which routes to iLook Next.js and FastAPI.

---

## Option B: If your existing tunnel is managed locally via CLI / Config File (`/etc/cloudflared/config.yml`)

1. Open your existing `config.yml` on the Oracle instance:
   ```bash
   sudo nano /etc/cloudflared/config.yml
   ```
2. Locate the `ingress:` block and insert the `ilook.labstackops.top` rule **above** the final `- service: http_status:404` fallback:

   ```yaml
   ingress:
     # --- Your existing apps are here ---
     - hostname: your-other-app.labstackops.top
       service: http://localhost:8080

     # ========================================================
     # iLook Video Platform (K3s Traefik Ingress)
     # ========================================================
     - hostname: ilook.labstackops.top
       service: http://127.0.0.1:80
       originRequest:
         httpHostHeader: ilook.labstackops.top

     # --- Catch-all rule (must always be last) ---
     - service: http_status:404
   ```

3. Restart your existing `cloudflared` systemd service:
   ```bash
   sudo systemctl restart cloudflared
   sudo systemctl status cloudflared
   ```

---

## K3s Architecture Summary

In **K3s**:
- **Traefik** is the built-in ingress controller running on host port `80` and `443`.
- Your existing **`cloudflared`** handles SSL offloading at Cloudflare edge and passes the plain HTTP request to `http://127.0.0.1:80` with `Host: ilook.labstackops.top`.
- Traefik inspects `07-ingress.yaml` and routes:
  - `https://ilook.labstackops.top/api/*` -> `ilook-backend:8000`
  - `https://ilook.labstackops.top/*` -> `ilook-frontend:3000`
- Raw media streaming (`stream.labstackops.top`) continues to talk directly to MediaMTX on `8554/tcp` and `8189/udp` via the Grey-Cloud DNS record, completely independent of the tunnel.
