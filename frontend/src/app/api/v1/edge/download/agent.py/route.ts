import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "ilooks.labstackops.top";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const cloudUrl = `${proto}://${host}`;

  const pythonScript = `import os
import sys
import json
import time
import argparse
import subprocess
import threading
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import requests

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CONFIG_PATH = os.path.join(DATA_DIR, "config.json")
LOCAL_PORT = int(os.getenv("LOCAL_PORT", "8555"))

class StreamPipeline:
    def __init__(self, name, local_rtsp, push_url):
        self.name = name
        self.local_rtsp = local_rtsp
        self.push_url = push_url
        self.running = False
        self.process = None

    def start(self):
        self.running = True
        t = threading.Thread(target=self._run, daemon=True)
        t.start()

    def _run(self):
        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "warning", "-nostats",
            "-rtsp_transport", "tcp", "-re", "-i", self.local_rtsp,
            "-c", "copy", "-f", "rtsp", "-rtsp_transport", "tcp", self.push_url
        ]
        backoff = 3
        while self.running:
            try:
                self.process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
                _, stderr = self.process.communicate()
                if self.running:
                    print(f"[{self.name}] Stream reconnecting in {backoff}s...")
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 30)
            except Exception as e:
                time.sleep(5)

    def stop(self):
        self.running = False
        if self.process:
            try:
                self.process.terminate()
            except Exception:
                pass

class StandaloneEdgeAgent:
    _instance = None

    def __init__(self, code=None, cloud=None):
        StandaloneEdgeAgent._instance = self
        os.makedirs(DATA_DIR, exist_ok=True)
        self.cloud_url = (cloud or os.getenv("CLOUD_URL", "${cloudUrl}")).rstrip("/")
        self.code = code or os.getenv("PAIRING_CODE")
        self.node_token = None
        self.node_id = None
        self.pipelines = {}
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
        return {"node_id": None, "node_token": None, "cameras": []}

    def save_config(self):
        self.config["node_id"] = self.node_id
        self.config["node_token"] = self.node_token
        with open(CONFIG_PATH, "w") as f:
            json.dump(self.config, f, indent=2)

    def pair(self):
        if self.node_token and self.node_id:
            print(f"[iLook] Reusing existing paired node: {self.node_id}")
            return True
        if not self.code:
            print("[iLook] Awaiting pairing code via local web UI (http://localhost:8555) or CLI...")
            return False

        try:
            print(f"[iLook] Claiming pairing code {self.code} from {self.cloud_url}...")
            resp = requests.post(f"{self.cloud_url}/api/v1/edge/pair/claim", json={
                "code": self.code,
                "node_name": os.getenv("NODE_NAME", "Local Edge Node"),
                "version": "1.0.0"
            }, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            self.node_id = data["edge_node_id"]
            self.node_token = data["node_token"]
            self.save_config()
            print("[iLook] Pairing successful! Node credentials saved.")
            return True
        except Exception as e:
            print(f"[iLook] Pairing failed: {e}")
            return False

    def heartbeat_loop(self):
        while True:
            if self.node_token:
                try:
                    requests.post(f"{self.cloud_url}/api/v1/edge/heartbeat",
                                  headers={"x-node-token": self.node_token},
                                  timeout=5)
                except Exception:
                    pass
            time.sleep(30)

    def register_camera(self, name, rtsp_url):
        if not self.node_token:
            raise Exception("Edge node is not paired yet. Please claim your pairing code first.")
        resp = requests.post(f"{self.cloud_url}/api/v1/edge/cameras/register",
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
            "rtsp_push_url": reg["rtsp_push_url"]
        }
        self.config["cameras"].append(cam_info)
        self.save_config()

        p = StreamPipeline(name, rtsp_url, reg["rtsp_push_url"])
        self.pipelines[reg["camera_id"]] = p
        p.start()
        print(f"[iLook] Added camera {name}: {rtsp_url} -> pushing to cloud.")
        return cam_info

    def run(self):
        if self.code:
            self.pair()
        threading.Thread(target=self.heartbeat_loop, daemon=True).start()

        env_rtsp = os.getenv("CAMERA_RTSP")
        if env_rtsp and not any(c.get("rtsp_source_url") == env_rtsp for c in self.config.get("cameras", [])):
            name = os.getenv("CAMERA_NAME", "Office Camera")
            try:
                self.add_camera(name, env_rtsp)
            except Exception as e:
                print(f"[iLook] Auto-registration error: {e}")

        for cam in self.config.get("cameras", []):
            print(f"[iLook] Starting outbound RTSP push for {cam['name']}...")
            p = StreamPipeline(cam["name"], cam["rtsp_source_url"], cam["rtsp_push_url"])
            self.pipelines[cam["camera_id"]] = p
            p.start()

# --- LOCAL EMBEDDED WEB DASHBOARD (http://localhost:8555) ---
class LocalWebHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Quiet logs

    def do_GET(self):
        agent = StandaloneEdgeAgent._instance
        parsed = urlparse(self.path)

        if parsed.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            data = {
                "paired": bool(agent.node_token),
                "node_id": agent.node_id,
                "cloud_url": agent.cloud_url,
                "cameras": agent.config.get("cameras", []),
                "active_pipelines": len(agent.pipelines)
            }
            self.wfile.write(json.dumps(data).encode("utf-8"))
            return

        # Main Local Web Console UI (Hik-Connect / Dahua DSS Professional Dark Style)
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>iLook Local Edge Console | Hik-Connect Edition</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body {{ background: #0B0F19; color: #E5E7EB; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }}
    .glow-border {{ box-shadow: 0 0 15px rgba(37, 99, 235, 0.2); }}
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between">
  <!-- Top Navigation Bar -->
  <header class="bg-[#111827] border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
        <i class="fa-solid fa-video text-lg"></i>
      </div>
      <div>
        <h1 class="text-base font-bold text-white flex items-center gap-2">
          iLook Local Edge Gateway
          <span class="text-[10px] bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-full font-mono uppercase">Local Console</span>
        </h1>
        <p class="text-xs text-gray-400">Zero-Port-Forwarding LAN & Cloud Synchronizer</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <a href="{agent.cloud_url}/dashboard" target="_blank" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/25 transition">
        <span>Open Cloud Portal</span>
        <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
      </a>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-6xl w-full mx-auto p-6 space-y-6">
    <!-- Status Overview Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-[#111827] border border-gray-800 rounded-2xl p-4 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl {'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50' if agent.node_token else 'bg-amber-950/60 text-amber-400 border border-amber-800/50'} flex items-center justify-center text-xl">
          <i class="fa-solid {'fa-shield-halved' if agent.node_token else 'fa-link-slash'}"></i>
        </div>
        <div>
          <span class="text-xs text-gray-400 uppercase tracking-wider block">Cloud Link Status</span>
          <span class="text-sm font-bold {'text-emerald-400' if agent.node_token else 'text-amber-400'}">
            {'Connected & Synchronized' if agent.node_token else 'Pending Pairing Code'}
          </span>
          <span class="text-[11px] text-gray-500 block truncate font-mono">{agent.cloud_url}</span>
        </div>
      </div>

      <div class="bg-[#111827] border border-gray-800 rounded-2xl p-4 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-blue-950/60 text-blue-400 border border-blue-800/50 flex items-center justify-center text-xl">
          <i class="fa-solid fa-camera"></i>
        </div>
        <div>
          <span class="text-xs text-gray-400 uppercase tracking-wider block">Local Cameras</span>
          <span class="text-lg font-bold text-white" id="cam-count">{len(agent.config.get("cameras", []))} Configured</span>
          <span class="text-[11px] text-gray-500 block">Streaming outbound via TLS</span>
        </div>
      </div>

      <div class="bg-[#111827] border border-gray-800 rounded-2xl p-4 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/50 flex items-center justify-center text-xl">
          <i class="fa-solid fa-network-wired"></i>
        </div>
        <div>
          <span class="text-xs text-gray-400 uppercase tracking-wider block">Local Web Port</span>
          <span class="text-sm font-bold text-indigo-400 font-mono">http://localhost:{LOCAL_PORT}</span>
          <span class="text-[11px] text-gray-500 block">LAN Access Available</span>
        </div>
      </div>
    </div>

    <!-- Pairing Code Box (If Not Paired) -->
    {"" if agent.node_token else f'''
    <div class="bg-amber-950/30 border border-amber-800/60 rounded-2xl p-6 text-amber-200">
      <h3 class="text-base font-bold text-white mb-2 flex items-center gap-2">
        <i class="fa-solid fa-triangle-exclamation text-amber-400"></i>
        Edge Gateway Not Claimed Yet
      </h3>
      <p class="text-xs text-amber-300/80 mb-4">
        Go to your cloud dashboard at <a href="{agent.cloud_url}/dashboard" target="_blank" class="underline font-semibold">{agent.cloud_url}</a>, click <b>Pair Edge Node</b>, and enter the 6-digit code below:
      </p>
      <form action="/api/claim" method="POST" class="flex gap-3 max-w-md">
        <input type="text" name="code" placeholder="Enter 6-digit code (e.g. 123456)" required maxlength="6"
               class="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white font-mono text-center tracking-widest text-lg focus:outline-none focus:border-amber-400">
        <button type="submit" class="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-xl transition">
          Pair Gateway
        </button>
      </form>
    </div>
    '''}

    <!-- Add Camera Form -->
    <div class="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
      <div class="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-circle-plus text-blue-500"></i>
          <h2 class="text-sm font-bold text-white uppercase tracking-wider">Add Local Camera (RTSP / ONVIF)</h2>
        </div>
        <span class="text-xs text-gray-400">Works with Hikvision, Dahua, CP Plus, Tapo, Reolink & Generic RTSP</span>
      </div>

      <form action="/api/add-camera" method="POST" class="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div class="md:col-span-4">
          <label class="block text-xs font-medium text-gray-400 mb-1">Camera Name</label>
          <input type="text" name="name" placeholder="e.g. Office Camera, Front Gate" required
                 class="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500">
        </div>
        <div class="md:col-span-6">
          <label class="block text-xs font-medium text-gray-400 mb-1">Local RTSP Stream URL</label>
          <input type="text" name="rtsp" placeholder="rtsp://admin:pass@192.168.1.100:554/Streaming/Channels/101" required
                 class="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-600 font-mono focus:outline-none focus:border-blue-500">
        </div>
        <div class="md:col-span-2 flex items-end">
          <button type="submit" class="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-plus text-[10px]"></i>
            <span>Add Camera</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Active Local Cameras Grid -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Active Local Camera Streams ({len(agent.config.get("cameras", []))})
        </h3>
        <span class="text-xs text-gray-500">Streamed locally and mirrored to Cloud Portal</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {"".join([f'''
        <div class="bg-[#111827] border border-gray-800 rounded-2xl p-5 space-y-3 relative group">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-blue-950/80 text-blue-400 flex items-center justify-center border border-blue-800/40">
                <i class="fa-solid fa-video text-xs"></i>
              </div>
              <div>
                <h4 class="text-sm font-bold text-white">{c["name"]}</h4>
                <span class="text-[10px] text-gray-500 font-mono">UID: {c.get("cam_uid", "Local")}</span>
              </div>
            </div>
            <span class="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live & Synced
            </span>
          </div>

          <div class="space-y-1.5 text-xs">
            <div class="bg-gray-950 p-2 rounded-lg border border-gray-800/80">
              <span class="text-[10px] text-gray-500 uppercase block font-semibold">Local Source:</span>
              <span class="text-gray-300 font-mono truncate block text-[11px]">{c["rtsp_source_url"]}</span>
            </div>
            <div class="bg-gray-950 p-2 rounded-lg border border-gray-800/80">
              <span class="text-[10px] text-gray-500 uppercase block font-semibold">Cloud Relay Target:</span>
              <span class="text-blue-400 font-mono truncate block text-[11px]">{c.get("rtsp_push_url", "Cloud Ingest")}</span>
            </div>
          </div>

          <div class="pt-2 flex items-center justify-between border-t border-gray-800/60 text-xs">
            <a href="{agent.cloud_url}/dashboard" target="_blank" class="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">
              <span>View on Cloud Dashboard</span>
              <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
            </a>
            <form action="/api/delete-camera" method="POST" onsubmit="return confirm('Remove this camera feed?');">
              <input type="hidden" name="camera_id" value="{c.get("camera_id")}">
              <button type="submit" class="text-rose-400 hover:text-rose-300 text-xs font-medium">
                <i class="fa-regular fa-trash-can mr-1"></i> Remove
              </button>
            </form>
          </div>
        </div>
        ''' for c in agent.config.get("cameras", [])]) if agent.config.get("cameras") else '''
        <div class="col-span-2 bg-[#111827] border border-dashed border-gray-800 rounded-2xl p-8 text-center space-y-2">
          <i class="fa-solid fa-camera-rotate text-3xl text-gray-600 mb-2"></i>
          <h4 class="text-sm font-semibold text-white">No Local Cameras Attached Yet</h4>
          <p class="text-xs text-gray-400 max-w-sm mx-auto">
            Use the form above to add your local RTSP camera feed (e.g. from Hikvision, Dahua, or CP Plus).
          </p>
        </div>
        '''}
      </div>
    </div>
  </main>

  <footer class="bg-[#111827] border-t border-gray-800 p-4 text-center text-xs text-gray-500">
    iLook Edge Gateway • Local Port {LOCAL_PORT} • Connected to <a href="{agent.cloud_url}" class="text-gray-400 hover:underline">{agent.cloud_url}</a>
  </footer>
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
                    print(f"[iLook] Error adding camera: {e}")
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
            self.send_response(303)
            self.send_header("Location", "/")
            self.end_headers()
            return

        self.send_response(404)
        self.end_headers()

def run_local_server():
    server = HTTPServer(("0.0.0.0", LOCAL_PORT), LocalWebHandler)
    print(f"==================================================================")
    print(f"  [iLook Local Console] Embedded Web Dashboard Active!            ")
    print(f"  • Local Web UI : http://localhost:{LOCAL_PORT}                   ")
    print(f"  • Cloud Portal : {StandaloneEdgeAgent._instance.cloud_url}/dashboard")
    print(f"==================================================================")
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
    parser.add_argument("--port", help="Local web UI port", default=8555, type=int)
    args = parser.parse_args()

    LOCAL_PORT = args.port
    if args.rtsp:
        os.environ["CAMERA_RTSP"] = args.rtsp
    if args.name:
        os.environ["CAMERA_NAME"] = args.name

    agent = StandaloneEdgeAgent(code=args.code, cloud=args.cloud)
    
    # Start embedded local web console in background
    t_web = threading.Thread(target=run_local_server, daemon=True)
    t_web.start()

    agent.run()
    while True:
        time.sleep(1)
`;

  return new NextResponse(pythonScript, {
    headers: {
      "Content-Type": "text/x-python; charset=utf-8",
      "Content-Disposition": 'attachment; filename="agent.py"',
    },
  });
}
