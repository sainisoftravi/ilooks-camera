import os
import sys
import json
import time
import socket
import select
import shutil
import argparse
import subprocess
import threading
import webbrowser
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import requests
import urllib3

# Suppress self-signed / local TLS verification warnings in terminal logs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Ensure immediate unbuffered console log flushing
try:
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
except Exception:
    pass

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
RECORDINGS_DIR = os.getenv("RECORDINGS_DIR", os.path.join(os.path.dirname(__file__), "recordings"))
CONFIG_PATH = os.path.join(DATA_DIR, "config.json")
LOCAL_PORT = int(os.getenv("LOCAL_PORT", "8090"))
MAX_STORAGE_GB = int(os.getenv("MAX_STORAGE_GB", "500"))

# --- 1. ZERO-CPU LOCAL LOOP RECORDER (5-MIN fMP4 SEGMENTS) ---
class LocalLoopRecorder:
    def __init__(self, cam_uid, name, rtsp_source):
        self.cam_uid = cam_uid
        self.name = name
        self.rtsp_source = rtsp_source
        self.running = False
        self.process = None

    def start(self):
        self.running = True
        t = threading.Thread(target=self._run, daemon=True)
        t.start()

    def _run(self):
        cam_dir = os.path.join(RECORDINGS_DIR, self.cam_uid)
        os.makedirs(cam_dir, exist_ok=True)
        
        while self.running:
            today = datetime.now().strftime("%Y-%m-%d")
            daily_dir = os.path.join(cam_dir, today)
            os.makedirs(daily_dir, exist_ok=True)
            output_pattern = os.path.join(daily_dir, "%H-%M-%S.mp4")

            # Segmented 300s (5-minute) chunks using copy (zero CPU re-encoding)
            cmd = [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostats",
                "-rtsp_transport", "tcp", "-i", self.rtsp_source,
                "-c", "copy", "-map", "0",
                "-f", "segment", "-segment_time", "300", "-reset_timestamps", "1",
                "-strftime", "1", output_pattern
            ]
            try:
                self.process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                self.process.wait()
            except Exception:
                time.sleep(5)
            time.sleep(3)

    def stop(self):
        self.running = False
        if self.process:
            try:
                self.process.terminate()
            except Exception:
                pass

# --- 2. LOCAL MEDIAMTX EMBEDDED ENGINE (RTSP :8556, WHEP :8889, HLS :8888) ---
class LocalMediaMTXManager:
    def __init__(self, config_dir):
        self.config_dir = config_dir
        self.config_path = os.path.join(config_dir, "mediamtx_local.yml")
        self.process = None
        self.bin_path = shutil.which("mediamtx") or ("/usr/local/bin/mediamtx" if os.path.exists("/usr/local/bin/mediamtx") else None)

    def is_available(self):
        return bool(self.bin_path and os.path.exists(self.bin_path))

    def generate_config(self, cameras):
        lines = [
            "logLevel: info",
            "logDestinations: [stdout]",
            "# Local Ingestion & Playback Ports",
            "rtsp: yes",
            "rtspAddress: :8556",
            "rtspTransports: [tcp]",
            "webrtc: yes",
            "webrtcAddress: :8889",
            "webrtcAllowOrigins: ['*']",
            "webrtcEncryption: no",
            "webrtcICEServers2:",
            "  - url: stun:stun.l.google.com:19302",
            "  - url: stun:stun1.l.google.com:19302",
            "hls: yes",
            "hlsAddress: :8888",
            "hlsAllowOrigins: ['*']",
            "hlsAlwaysRemux: yes",
            "hlsVariant: lowLatency",
            "hlsSegmentCount: 3",
            "hlsSegmentDuration: 1s",
            "api: yes",
            "apiAddress: :9997",
            "paths:",
        ]
        valid_cams = [c for c in cameras if c.get("rtsp_source_url")]
        if not valid_cams:
            lines.append("  all:")
        else:
            for cam in valid_cams:
                cam_key = cam.get("cam_uid") or cam.get("camera_id") or "live"
                rtsp = cam.get("rtsp_source_url")
                lines.append(f"  {cam_key}:")
                lines.append(f"    source: {rtsp}")
                lines.append("    sourceOnDemand: no")
                lines.append("    rtspTransport: tcp")
        return "\n".join(lines) + "\n"

    def restart(self, cameras):
        if not self.is_available():
            print("[Local MediaMTX] Binary not detected in PATH. Running with direct FFmpeg loop.")
            return
        os.makedirs(self.config_dir, exist_ok=True)
        with open(self.config_path, "w") as f:
            f.write(self.generate_config(cameras))

        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=3)
            except Exception:
                try: self.process.kill()
                except Exception: pass

        cmd = [self.bin_path, self.config_path]
        try:
            self.process = subprocess.Popen(cmd)
            print("[Local MediaMTX] Active on RTSP :8556, WebRTC :8889 (STUN Enabled), HLS :8888")
        except Exception as e:
            print(f"[Local MediaMTX] Start error: {e}")

# --- 3. OUTBOUND CLOUD STREAM PIPELINE ---
class StreamPipeline:
    def __init__(self, name, local_rtsp, push_url, cam_uid=None):
        self.name = name
        self.local_rtsp = local_rtsp
        self.push_url = push_url
        self.cam_uid = cam_uid
        self.running = False
        self.process = None

    def start(self):
        self.running = True
        t = threading.Thread(target=self._run, daemon=True)
        t.start()

    def _run(self):
        # Push directly from source RTSP to cloud with auto-reconnection
        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "warning", "-nostats",
            "-rtsp_transport", "tcp",
            "-reconnect", "1", "-reconnect_at_eof", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "2",
            "-i", self.local_rtsp,
            "-c", "copy", "-f", "rtsp", "-rtsp_transport", "tcp", self.push_url
        ]
        print(f"[iLooks-Connect] Outbound cloud relay started for {self.name} -> {self.push_url}")
        backoff = 2
        while self.running:
            try:
                self.process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
                _, stderr = self.process.communicate()
                if self.running:
                    print(f"[{self.name}] Stream connection dropped. Retrying in {backoff}s...")
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 20)
            except Exception as e:
                print(f"[{self.name}] Relay error: {e}")
                time.sleep(4)

    def stop(self):
        self.running = False
        if self.process:
            try:
                self.process.terminate()
            except Exception:
                pass

# --- 4. ONVIF / WS-DISCOVERY SCANNER (239.255.255.250:3702) ---
def discover_onvif_cameras(timeout=3):
    WS_DISCOVERY_PAYLOAD = b'''<?xml version="1.0" encoding="utf-8"?>
<Envelope xmlns:tds="http://www.onvif.org/ver10/device/wsdl" xmlns="http://www.w3.org/2003/05/soap-envelope">
  <Header>
    <wsa:MessageID xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">uuid:c42337d1-12c8-479a-bf7c-6e06b9b87df3</wsa:MessageID>
    <wsa:To xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">urn:schemas-xmlsoap-org:ws:2005/04/discovery</wsa:To>
    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
  </Header>
  <Body>
    <Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery">
      <Types>tds:Device</Types>
    </Probe>
  </Body>
</Envelope>'''
    cameras = []
    seen_ips = set()
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 4)
    sock.setblocking(False)

    try:
        sock.sendto(WS_DISCOVERY_PAYLOAD, ("239.255.255.250", 3702))
        start_time = time.time()
        while time.time() - start_time < timeout:
            ready = select.select([sock], [], [], 0.5)
            if ready[0]:
                data, addr = sock.recvfrom(4096)
                ip = addr[0]
                if ip not in seen_ips:
                    seen_ips.add(ip)
                    text = data.decode("utf-8", errors="ignore")
                    brand = "Generic ONVIF"
                    if "hikvision" in text.lower(): brand = "Hikvision"
                    elif "dahua" in text.lower(): brand = "Dahua"
                    elif "cpplus" in text.lower() or "cp plus" in text.lower(): brand = "CP Plus"
                    elif "uniview" in text.lower(): brand = "Uniview"
                    elif "axis" in text.lower(): brand = "Axis"

                    cameras.append({
                        "ip": ip,
                        "brand": brand,
                        "port": 554,
                        "default_rtsp": f"rtsp://admin:pass@{ip}:554/Streaming/Channels/101" if brand == "Hikvision" else f"rtsp://admin:pass@{ip}:554/cam/realmonitor?channel=1&subtype=0"
                    })
    except Exception as e:
        print(f"[ONVIF Discovery Error] {e}")
    finally:
        sock.close()
    return cameras

def safe_post(url, **kwargs):
    try:
        return requests.post(url, **kwargs)
    except requests.exceptions.SSLError:
        kwargs["verify"] = False
        return requests.post(url, **kwargs)

# --- 4. CORE AGENT CONTROLLER ---
class StandaloneEdgeAgent:
    _instance = None

    def __init__(self, code=None, cloud=None):
        StandaloneEdgeAgent._instance = self
        os.makedirs(DATA_DIR, exist_ok=True)
        os.makedirs(RECORDINGS_DIR, exist_ok=True)
        self.cloud_url = (cloud or os.getenv("CLOUD_URL", "https://ilooks.labstackops.top")).rstrip("/")
        self.code = code or os.getenv("PAIRING_CODE")
        self.node_token = None
        self.node_id = None
        self.pipelines = {}
        self.recorders = {}
        self.mtx = LocalMediaMTXManager(DATA_DIR)
        self.config = self.load_config()

    def load_config(self):
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, "r") as f:
                    data = json.load(f)
                    self.node_token = data.get("node_token")
                    self.node_id = data.get("node_id")
                    return data
            except Exception:
                pass
        return {"node_id": None, "node_token": None, "local_recording": True, "cameras": []}

    def save_config(self):
        self.config["node_id"] = self.node_id
        self.config["node_token"] = self.node_token
        with open(CONFIG_PATH, "w") as f:
            json.dump(self.config, f, indent=2)

    def pair(self):
        if self.node_token and self.node_id:
            return True
        if not self.code:
            return False

        try:
            print(f"[iLooks-Connect] Claiming pairing key {self.code} from {self.cloud_url}...")
            resp = safe_post(f"{self.cloud_url}/api/v1/edge/pair/claim", json={
                "code": self.code,
                "node_name": os.getenv("NODE_NAME", "iLooks Edge Gateway"),
                "version": "2.0.0"
            }, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            self.node_id = data["edge_node_id"]
            self.node_token = data["node_token"]
            self.save_config()
            print("[iLooks-Connect] Gateway successfully paired and linked to cloud!")
            return True
        except Exception as e:
            print(f"[iLooks-Connect] Pairing failed: {e}")
            return False

    def heartbeat_loop(self):
        while True:
            if self.node_token:
                try:
                    safe_post(f"{self.cloud_url}/api/v1/edge/heartbeat",
                              headers={"x-node-token": self.node_token},
                              timeout=5)
                except Exception:
                    pass
            time.sleep(30)

    def storage_cleaner_loop(self):
        """FIFO Ring Buffer Watchdog: deletes oldest recordings when disk usage > 90%"""
        while True:
            try:
                total, used, free = shutil.disk_usage(RECORDINGS_DIR)
                usage_pct = (used / total) * 100
                if usage_pct > 90:
                    # Find and delete oldest files
                    all_files = []
                    for root, _, files in os.walk(RECORDINGS_DIR):
                        for f in files:
                            if f.endswith(".mp4"):
                                p = os.path.join(root, f)
                                all_files.append((os.path.getmtime(p), p))
                    all_files.sort(key=lambda x: x[0])
                    for _, p in all_files[:20]: # delete oldest 20 segments
                        try: os.remove(p)
                        except Exception: pass
            except Exception:
                pass
            time.sleep(60)

    def register_camera(self, name, rtsp_url):
        if not self.node_token:
            raise Exception("Gateway not paired with cloud yet. Please enter pairing code.")
        resp = safe_post(f"{self.cloud_url}/api/v1/edge/cameras/register",
                         headers={"x-node-token": self.node_token},
                         json={"name": name, "rtsp_source_url": rtsp_url},
                         timeout=10)
        resp.raise_for_status()
        return resp.json()

    def add_camera(self, name, rtsp_url):
        name = name.strip() or "Local Camera"
        rtsp_url = rtsp_url.strip()
        reg = self.register_camera(name, rtsp_url)
        cam_info = {
            "camera_id": reg["camera_id"],
            "cam_uid": reg["cam_uid"],
            "name": name,
            "rtsp_source_url": rtsp_url,
            "rtsp_push_url": reg["rtsp_push_url"],
            "recording_active": True
        }
        self.config["cameras"].append(cam_info)
        self.save_config()

        # 1. Update and restart local MediaMTX engine for zero-latency local playback
        self.mtx.restart(self.config["cameras"])

        # 2. Start Outbound Cloud Relay
        p = StreamPipeline(name, rtsp_url, reg["rtsp_push_url"], cam_uid=reg["cam_uid"])
        self.pipelines[reg["camera_id"]] = p
        p.start()

        # 3. Start Local Loop Recorder (5-min chunks)
        if self.config.get("local_recording", True):
            rec = LocalLoopRecorder(reg["cam_uid"], name, rtsp_url)
            self.recorders[reg["camera_id"]] = rec
            rec.start()

        return cam_info

    def run(self):
        if self.code:
            self.pair()
        threading.Thread(target=self.heartbeat_loop, daemon=True).start()
        threading.Thread(target=self.storage_cleaner_loop, daemon=True).start()

        env_rtsp = os.getenv("CAMERA_RTSP")
        if env_rtsp and not any(c.get("rtsp_source_url") == env_rtsp for c in self.config.get("cameras", [])):
            name = os.getenv("CAMERA_NAME", "Office Camera")
            try:
                self.add_camera(name, env_rtsp)
            except Exception as e:
                print(f"[iLooks-Connect] Auto-attach camera error: {e}")

        # Start Local MediaMTX for existing cameras
        self.mtx.restart(self.config.get("cameras", []))

        for cam in self.config.get("cameras", []):
            p = StreamPipeline(cam["name"], cam["rtsp_source_url"], cam["rtsp_push_url"], cam_uid=cam.get("cam_uid"))
            self.pipelines[cam["camera_id"]] = p
            p.start()

            if self.config.get("local_recording", True):
                rec = LocalLoopRecorder(cam["cam_uid"], cam["name"], cam["rtsp_source_url"])
                self.recorders[cam["camera_id"]] = rec
                rec.start()

# --- 5. LOCAL BROWSER SETUP WIZARD (http://localhost:8090) ---
class LocalWebHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        agent = StandaloneEdgeAgent._instance
        parsed = urlparse(self.path)

        if parsed.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "paired": bool(agent.node_token),
                "node_id": agent.node_id,
                "cloud_url": agent.cloud_url,
                "recordings_path": RECORDINGS_DIR,
                "cameras": agent.config.get("cameras", []),
                "active_pipelines": len(agent.pipelines)
            }).encode("utf-8"))
            return

        elif parsed.path == "/api/scan":
            cameras = discover_onvif_cameras(timeout=2.5)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"cameras": cameras}).encode("utf-8"))
            return

        # HTML WIZARD (Exact Obsidian & Emerald Theme)
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>iLooks-Connect | Local Gateway Console</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body {{ background: #070A0F; color: #E5E7EB; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }}
    .neon-pill {{ border: 1px solid rgba(16, 185, 129, 0.5); box-shadow: 0 0 15px rgba(16, 185, 129, 0.2); }}
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
  <header class="bg-[#0B0F19] border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-gray-950 font-black shadow-lg shadow-emerald-500/25">
        <i class="fa-solid fa-eye text-lg"></i>
      </div>
      <div>
        <h1 class="text-base font-extrabold text-white flex items-center gap-1.5">
          iLooks<span class="text-[#10B981]">-Connect</span>
          <span class="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded-full font-mono uppercase">Local VMS Agent</span>
        </h1>
        <p class="text-[10px] text-gray-400 font-semibold tracking-widest uppercase">ANYWHERE. ANYTIME.</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <a href="{agent.cloud_url}/dashboard" target="_blank" class="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-gray-950 text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition">
        <span>Open Cloud Video Wall</span>
        <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
      </a>
    </div>
  </header>

  <main class="max-w-6xl w-full mx-auto p-6 space-y-6">
    <!-- Status Overview -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-[#101622] border border-gray-800 rounded-2xl p-4 flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-xl {'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' if agent.node_token else 'bg-amber-950/80 text-amber-400 border border-amber-800/60'} flex items-center justify-center text-lg">
          <i class="fa-solid {'fa-shield-halved' if agent.node_token else 'fa-link-slash'}"></i>
        </div>
        <div>
          <span class="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Cloud Uplink</span>
          <span class="text-xs font-bold {'text-emerald-400' if agent.node_token else 'text-amber-400'}">
            {'Synced & Online' if agent.node_token else 'Awaiting Pairing'}
          </span>
          <span class="text-[10px] text-gray-500 block truncate">{agent.cloud_url}</span>
        </div>
      </div>

      <div class="bg-[#101622] border border-gray-800 rounded-2xl p-4 flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center justify-center text-lg">
          <i class="fa-solid fa-hard-drive"></i>
        </div>
        <div>
          <span class="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Local NVR Storage</span>
          <span class="text-xs font-bold text-white">5-Min fMP4 Loop</span>
          <span class="text-[10px] text-gray-500 block truncate">{RECORDINGS_DIR}</span>
        </div>
      </div>

      <div class="bg-[#101622] border border-gray-800 rounded-2xl p-4 flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-xl bg-teal-950/80 text-teal-400 border border-teal-800/60 flex items-center justify-center text-lg">
          <i class="fa-solid fa-video"></i>
        </div>
        <div>
          <span class="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Active Streams</span>
          <span class="text-xs font-bold text-white">{len(agent.config.get("cameras", []))} Cameras</span>
          <span class="text-[10px] text-emerald-400 block font-mono">0% CPU (FFmpeg Copy)</span>
        </div>
      </div>

      <div class="bg-[#101622] border border-gray-800 rounded-2xl p-4 flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/60 flex items-center justify-center text-lg">
          <i class="fa-solid fa-network-wired"></i>
        </div>
        <div>
          <span class="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Local Wizard Port</span>
          <span class="text-xs font-bold text-purple-300 font-mono">127.0.0.1:{LOCAL_PORT}</span>
          <span class="text-[10px] text-gray-500 block">System Tray Active</span>
        </div>
      </div>
    </div>

    <!-- Pairing Code Card (If not paired) -->
    {"" if agent.node_token else f'''
    <div class="bg-[#101622] border border-amber-500/50 rounded-2xl p-6 text-amber-200 shadow-xl">
      <h3 class="text-sm font-bold text-white mb-2 flex items-center gap-2">
        <i class="fa-solid fa-key text-amber-400"></i> Enter Cloud Pairing Key
      </h3>
      <p class="text-xs text-gray-400 mb-4">
        Open <a href="{agent.cloud_url}/dashboard" target="_blank" class="text-emerald-400 underline font-semibold">{agent.cloud_url}</a> to get your 6-digit key.
      </p>
      <form action="/api/claim" method="POST" class="flex gap-3 max-w-sm">
        <input type="text" name="code" placeholder="e.g. 650346" required maxlength="6"
               class="flex-1 px-4 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white font-mono text-center tracking-widest text-lg focus:outline-none focus:border-amber-400">
        <button type="submit" class="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold text-xs rounded-xl transition">
          Pair Gateway
        </button>
      </form>
    </div>
    '''}

    <!-- 1-Click ONVIF / SADP Scanner -->
    <div class="bg-[#101622] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div class="flex items-center justify-between border-b border-gray-800 pb-3">
        <div>
          <h2 class="text-sm font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-radar text-emerald-400"></i>
            Automatic LAN Camera Scanner (Hikvision / CP Plus / Dahua / ONVIF)
          </h2>
          <p class="text-xs text-gray-400">Broadcasts WS-Discovery to find all security cameras on your local PoE switch / router.</p>
        </div>
        <button onclick="scanCameras()" id="scan-btn" class="px-4 py-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2 transition">
          <i class="fa-solid fa-magnifying-glass"></i>
          <span>Scan Local Network</span>
        </button>
      </div>

      <div id="scan-results" class="hidden space-y-2">
        <span class="text-xs font-semibold text-gray-300 block">Discovered IP Cameras:</span>
        <div id="scan-list" class="grid grid-cols-1 md:grid-cols-2 gap-3"></div>
      </div>
    </div>

    <!-- Manual RTSP / DVR Channel Form -->
    <div class="bg-[#101622] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div class="flex items-center justify-between border-b border-gray-800 pb-3">
        <h2 class="text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-circle-plus text-emerald-400"></i>
          Add Camera (Direct RTSP / DVR Channel)
        </h2>
        <span class="text-xs text-gray-500">Supports Hikvision Channels, Dahua & CP Plus</span>
      </div>

      <form action="/api/add-camera" method="POST" class="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div class="md:col-span-4">
          <label class="block text-xs font-medium text-gray-400 mb-1">Camera Name</label>
          <input type="text" name="name" placeholder="e.g. Reception Camera" required
                 class="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500">
        </div>
        <div class="md:col-span-6">
          <label class="block text-xs font-medium text-gray-400 mb-1">RTSP Stream URL</label>
          <input type="text" name="rtsp" placeholder="rtsp://admin:pass@192.168.1.100:554/Streaming/Channels/101" required
                 class="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500">
        </div>
        <div class="md:col-span-2 flex items-end">
          <button type="submit" class="w-full py-2.5 bg-[#10B981] hover:bg-[#059669] text-gray-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-check text-[10px]"></i>
            <span>Add Feed</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Active Local Cameras Grid -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Active Cameras & Local NVR Recordings ({len(agent.config.get("cameras", []))})
        </h3>
        <span class="text-xs text-gray-500">5-minute loop recordings stored in {RECORDINGS_DIR}</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {"".join([f'''
        <div class="bg-[#101622] border border-gray-800 rounded-2xl p-5 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center border border-emerald-800/40">
                <i class="fa-solid fa-video text-xs"></i>
              </div>
              <div>
                <h4 class="text-sm font-bold text-white">{c["name"]}</h4>
                <span class="text-[10px] text-gray-500 font-mono">UID: {c.get("cam_uid", "Local")}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="toggleLocalMode('{c.get('cam_uid', 'live')}')" id="mode-{c.get('cam_uid', 'live')}" class="px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-700 bg-gray-900/90 text-gray-300 hover:text-white" title="Switch WebRTC / HLS">⚡ WebRTC</button>
              <span class="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live & Recording
              </span>
            </div>
          </div>

          <div class="space-y-1.5 text-xs">
            <!-- Local Live Video Player (MediaMTX WebRTC & HLS) -->
            <div class="relative aspect-video bg-black rounded-xl overflow-hidden border border-gray-800 shadow-inner group">
              <video id="player-{c.get('cam_uid', 'live')}" autoplay playsinline muted controls class="w-full h-full object-contain bg-black"></video>
              <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/40 text-[10px] font-bold text-emerald-400 backdrop-blur-sm pointer-events-none">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> LOCAL LIVE
              </div>
              <button onclick="startLocalPlayer('{c.get('cam_uid', 'live')}')" class="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-300 text-xs border border-gray-700 backdrop-blur-sm" title="Reload Local Stream">
                <i class="fa-solid fa-rotate-right"></i>
              </button>
            </div>

            <div class="bg-gray-950 p-2 rounded-lg border border-gray-800/80">
              <span class="text-[10px] text-gray-500 uppercase block font-semibold">Local LAN Feed:</span>
              <span class="text-gray-300 font-mono truncate block text-[11px]">{c["rtsp_source_url"]}</span>
            </div>
          </div>

          <div class="pt-2 flex items-center justify-between border-t border-gray-800/60 text-xs">
            <a href="{agent.cloud_url}/dashboard" target="_blank" class="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1">
              <span>View in Cloud VMS</span>
              <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
            </a>
            <form action="/api/delete-camera" method="POST" onsubmit="return confirm('Remove this camera?');">
              <input type="hidden" name="camera_id" value="{c.get("camera_id")}">
              <button type="submit" class="text-rose-400 hover:text-rose-300 text-xs font-medium">
                <i class="fa-regular fa-trash-can mr-1"></i> Remove
              </button>
            </form>
          </div>
        </div>
        ''' for c in agent.config.get("cameras", [])]) if agent.config.get("cameras") else '''
        <div class="col-span-2 bg-[#101622] border border-dashed border-gray-800 rounded-2xl p-8 text-center space-y-2">
          <i class="fa-solid fa-video-slash text-3xl text-gray-600 mb-2"></i>
          <h4 class="text-sm font-semibold text-white">No Cameras Attached Yet</h4>
          <p class="text-xs text-gray-400 max-w-sm mx-auto">
            Click <b>Scan Local Network</b> or use the form above to add your camera stream.
          </p>
        </div>
        '''}
      </div>
    </div>
  </main>

  <footer class="bg-[#0B0F19] border-t border-gray-800 p-4 text-center text-xs text-gray-500">
    iLooks-Connect Local Gateway • Port {LOCAL_PORT} • <a href="{agent.cloud_url}" class="text-emerald-400 hover:underline">{agent.cloud_url}</a>
  </footer>

  <script>
    async function scanCameras() {{
      const btn = document.getElementById("scan-btn");
      btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Scanning LAN...';
      try {{
        const res = await fetch("/api/scan");
        const data = await res.json();
        const results = document.getElementById("scan-results");
        const list = document.getElementById("scan-list");
        list.innerHTML = "";
        results.classList.remove("hidden");

        if (!data.cameras || data.cameras.length === 0) {{
          list.innerHTML = '<div class="col-span-2 text-xs text-gray-500 p-3 bg-gray-950 rounded-xl border border-gray-800">No ONVIF cameras responded on UDP 3702. Try adding manually via IP.</div>';
        }} else {{
          data.cameras.forEach(cam => {{
            const div = document.createElement("div");
            div.className = "p-3 bg-gray-950 border border-gray-800 rounded-xl flex items-center justify-between text-xs";
            div.innerHTML = `
              <div>
                <span class="font-bold text-white block">${{cam.brand}} (${{cam.ip}})</span>
                <span class="text-[10px] text-gray-500 font-mono">${{cam.default_rtsp}}</span>
              </div>
              <button onclick="fillRtsp('${{cam.brand}}', '${{cam.default_rtsp}}')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-gray-950 font-bold rounded-lg text-xs">
                Use Feed
              </button>
            `;
            list.appendChild(div);
          }});
        }}
      }} catch (e) {{
        alert("Scan failed: " + e.message);
      }} finally {{
        btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Scan Local Network';
      }}
    }}

    function fillRtsp(brand, rtsp) {{
      document.querySelector("input[name='name']").value = brand + " Camera";
      document.querySelector("input[name='rtsp']").value = rtsp;
      window.scrollTo({{ top: document.body.scrollHeight / 2, behavior: 'smooth' }});
    }}

    const activeLocalPCs = {{}};
    const activeLocalHls = {{}};

    function startLocalPlayer(camUid, forceMode = null) {{
      const video = document.getElementById("player-" + camUid);
      const btn = document.getElementById("mode-" + camUid);
      if (!video) return;

      const host = window.location.hostname || "127.0.0.1";
      const whepUrl = "http://" + host + ":8889/" + camUid + "/whep";
      const hlsUrl = "http://" + host + ":8888/" + camUid + "/index.m3u8";

      // Cleanup existing
      if (activeLocalPCs[camUid]) {{
        activeLocalPCs[camUid].close();
        delete activeLocalPCs[camUid];
      }}
      if (activeLocalHls[camUid]) {{
        activeLocalHls[camUid].destroy();
        delete activeLocalHls[camUid];
      }}

      if (forceMode === "hls") {{
        if (btn) btn.innerText = "📺 HLS";
        if (window.Hls && Hls.isSupported()) {{
          const hls = new Hls({{ enableWorker: true, lowLatencyMode: true }});
          activeLocalHls[camUid] = hls;
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
        }} else if (video.canPlayType('application/vnd.apple.mpegurl')) {{
          video.src = hlsUrl;
        }}
        return;
      }}

      // 1. Ultra-low-latency WebRTC WHEP negotiation with Google STUN
      if (btn) btn.innerText = "⚡ WebRTC";
      const pc = new RTCPeerConnection({{
        iceServers: [
          {{ urls: "stun:stun.l.google.com:19302" }},
          {{ urls: "stun:stun1.l.google.com:19302" }}
        ]
      }});
      activeLocalPCs[camUid] = pc;
      pc.addTransceiver('video', {{ direction: 'recvonly' }});
      pc.addTransceiver('audio', {{ direction: 'recvonly' }});
      pc.ontrack = (ev) => {{
        if (ev.streams[0]) {{
          video.srcObject = ev.streams[0];
        }}
      }};

      pc.createOffer().then(offer => {{
        pc.setLocalDescription(offer);
        return fetch(whepUrl, {{
          method: "POST",
          headers: {{ "Content-Type": "application/sdp" }},
          body: offer.sdp
        }});
      }}).then(res => {{
        if (!res.ok) throw new Error("WHEP error " + res.status);
        return res.text();
      }}).then(sdp => {{
        pc.setRemoteDescription({{ type: 'answer', sdp: sdp }});
      }}).catch(() => {{
        // Auto failover to HLS if WebRTC fails
        startLocalPlayer(camUid, "hls");
      }});
    }}

    function toggleLocalMode(camUid) {{
      const btn = document.getElementById("mode-" + camUid);
      const isCurrentlyWebRTC = btn && btn.innerText.includes("WebRTC");
      startLocalPlayer(camUid, isCurrentlyWebRTC ? "hls" : "webrtc");
    }}

    document.addEventListener("DOMContentLoaded", () => {{
      document.querySelectorAll("video[id^='player-']").forEach(v => {{
        const uid = v.id.replace("player-", "");
        startLocalPlayer(uid);
      }});
    }});
  </script>
</body>
</html>
"""
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html.encode("utf-8"))

    def do_POST(self):
        agent = StandaloneEdgeAgent._instance
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8")
        params = parse_qs(body)

        if self.path == "/api/claim":
            code = params.get("code", [""])[0].strip()
            if code:
                agent.code = code
                agent.pair()
            self.send_response(303)
            self.send_header("Location", "/")
            self.end_headers()
            return

        elif self.path == "/api/add-camera":
            name = params.get("name", ["Office Camera"])[0].strip()
            rtsp = params.get("rtsp", [""])[0].strip()
            if rtsp:
                try:
                    agent.add_camera(name, rtsp)
                except Exception as e:
                    print(f"[iLooks-Connect] Error adding camera: {e}")
            self.send_response(303)
            self.send_header("Location", "/")
            self.end_headers()
            return

        elif self.path == "/api/delete-camera":
            cam_id = params.get("camera_id", [""])[0].strip()
            if cam_id:
                agent.config["cameras"] = [c for c in agent.config.get("cameras", []) if c.get("camera_id") != cam_id]
                agent.save_config()
                if cam_id in agent.pipelines:
                    agent.pipelines[cam_id].stop()
                    del agent.pipelines[cam_id]
                if cam_id in agent.recorders:
                    agent.recorders[cam_id].stop()
                    del agent.recorders[cam_id]
                agent.mtx.restart(agent.config["cameras"])
            self.send_response(303)
            self.send_header("Location", "/")
            self.end_headers()
            return

        self.send_response(404)
        self.end_headers()

def run_local_server():
    server = HTTPServer(("0.0.0.0", LOCAL_PORT), LocalWebHandler)
    print("==================================================================")
    print(f"  [iLooks-Connect] Local Gateway Running on http://127.0.0.1:{LOCAL_PORT}")
    print(f"  • Local Setup Wizard : http://localhost:{LOCAL_PORT}")
    print(f"  • Cloud Video Wall   : {StandaloneEdgeAgent._instance.cloud_url}/dashboard")
    print("==================================================================")
    try:
        if os.getenv("NO_BROWSER") != "1" and sys.stdin.isatty():
            webbrowser.open(f"http://localhost:{LOCAL_PORT}")
    except Exception:
        pass
    server.serve_forever()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--code", help="6-digit pairing code")
    parser.add_argument("--cloud", help="Cloud URL")
    parser.add_argument("--rtsp", help="Local camera RTSP URL")
    parser.add_argument("--name", help="Camera name", default="Office Camera")
    parser.add_argument("--port", help="Local web UI port", default=8090, type=int)
    args = parser.parse_args()

    LOCAL_PORT = args.port
    if args.rtsp:
        os.environ["CAMERA_RTSP"] = args.rtsp
    if args.name:
        os.environ["CAMERA_NAME"] = args.name

    agent = StandaloneEdgeAgent(code=args.code, cloud=args.cloud)
    
    t_web = threading.Thread(target=run_local_server, daemon=True)
    t_web.start()

    agent.run()
    while True:
        time.sleep(1)
