# Oracle Cloud (OCI) VCN & Host Firewall Configuration for iLook

To allow direct RTSP ingestion (`8554/tcp`), WHEP signaling (`8889/tcp`), and WebRTC ICE streaming (`8189/udp`) to reach your MediaMTX pod running in K3s on your Oracle Cloud Ampere A1 ARM64 instance, you **must configure two firewall layers**:
1. **OCI Cloud VCN Security List** (Cloud level)
2. **Ubuntu Host `iptables` / `ufw`** (OS level) ⚠️ *Crucial: Oracle Cloud's default Ubuntu images include custom `REJECT` rules that silently drop traffic even if the VCN allows it!*

---

## Layer 1: Oracle Cloud Infrastructure (OCI) VCN Security List

1. Log into your **Oracle Cloud Console**.
2. Navigate to: **Networking** > **Virtual Cloud Networks (VCN)** > Click your VCN > **Security Lists** > **Default Security List for your VCN**.
3. Click **Add Ingress Rules** and create these 3 rules:

| Stateless | Source CIDR | IP Protocol | Source Port Range | Destination Port Range | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **No** | `0.0.0.0/0` | **TCP** | All | `8554` | iLook MediaMTX RTSP Ingestion |
| **No** | `0.0.0.0/0` | **TCP** | All | `8889` | iLook MediaMTX WHEP WebRTC Signaling |
| **No** | `0.0.0.0/0` | **UDP** | All | `8189` | iLook MediaMTX WebRTC ICE UDP Media |

*(Optional: If you wish to enable WebRTC over TCP fallback, also add `8189/tcp`).*

---

## Layer 2: Host OS (Ubuntu on OCI) Firewall Bypass

Oracle Cloud's default Ubuntu image runs `iptables` with an explicit `REJECT --reject-with icmp-host-prohibited` at the end of the `INPUT` chain.

SSH into your OCI Ampere A1 instance and run the following commands to place the ACCEPT rules **before** the REJECT rule:

```bash
# 1. Allow RTSP Ingestion (TCP 8554)
sudo iptables -I INPUT 1 -p tcp --dport 8554 -j ACCEPT

# 2. Allow WebRTC WHEP Signaling (TCP 8889)
sudo iptables -I INPUT 1 -p tcp --dport 8889 -j ACCEPT

# 3. Allow WebRTC ICE UDP Media (UDP 8189)
sudo iptables -I INPUT 1 -p udp --dport 8189 -j ACCEPT

# 4. Make rules persistent across reboots
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

If you use `ufw` instead:
```bash
sudo ufw allow 8554/tcp
sudo ufw allow 8889/tcp
sudo ufw allow 8189/udp
sudo ufw reload
```

---

## Layer 3: Verification & Port Testing Commands

Run these checks from your local computer or another server to verify end-to-end connectivity:

### 1. Test TCP 8554 (MediaMTX RTSP Port)
```bash
nc -zv stream.labstackops.top 8554
# Expected output: Connection to stream.labstackops.top 8554 port [tcp/*] succeeded!
```

### 2. Test TCP 8889 (MediaMTX WHEP HTTP Port)
```bash
curl -I http://stream.labstackops.top:8889
# Expected output: HTTP/1.1 404 Not Found (or 200 OK), proving MediaMTX is responding!
```

### 3. Test UDP 8189 (WebRTC ICE Port)
```bash
nc -u -zv stream.labstackops.top 8189
# Or use nmap:
nmap -sU -p 8189 stream.labstackops.top
```

### 4. Verify MediaMTX HostPort Binding on K3s
On your OCI instance:
```bash
sudo ss -tulpn | grep -E '8554|8889|8189'
```
You should see `mediamtx` listening on `0.0.0.0:8554`, `0.0.0.0:8889`, and `0.0.0.0:8189`.
