import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Return the complete, standalone edge agent Python script
  const pythonScript = `import os
import sys
import json
import time
import argparse
import subprocess
import threading
import requests

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CONFIG_PATH = os.path.join(DATA_DIR, "config.json")

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
    def __init__(self, code=None, cloud=None):
        os.makedirs(DATA_DIR, exist_ok=True)
        self.cloud_url = (cloud or os.getenv("CLOUD_URL", "https://ilooks.labstackops.top")).rstrip("/")
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
            return
        if not self.code:
            self.code = input("Enter 6-digit Pairing Code: ").strip()

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

    def heartbeat_loop(self):
        while True:
            try:
                requests.post(f"{self.cloud_url}/api/v1/edge/heartbeat",
                              headers={"x-node-token": self.node_token},
                              timeout=5)
            except Exception:
                pass
            time.sleep(30)

    def register_camera(self, name, rtsp_url):
        resp = requests.post(f"{self.cloud_url}/api/v1/edge/cameras/register",
                             headers={"x-node-token": self.node_token},
                             json={"name": name, "rtsp_source_url": rtsp_url},
                             timeout=10)
        resp.raise_for_status()
        return resp.json()

    def run(self):
        self.pair()
        threading.Thread(target=self.heartbeat_loop, daemon=True).start()

        if not self.config.get("cameras") and not os.getenv("CAMERA_RTSP"):
            if hasattr(sys.stdin, "isatty") and sys.stdin.isatty():
                print("\n[Optional] Connect a local camera feed:")
                inp_rtsp = input("Enter Local Camera RTSP URL (press Enter to skip): ").strip()
                if inp_rtsp:
                    inp_name = input("Enter Camera Name [Office Camera]: ").strip() or "Office Camera"
                    os.environ["CAMERA_RTSP"] = inp_rtsp
                    os.environ["CAMERA_NAME"] = inp_name

        env_rtsp = os.getenv("CAMERA_RTSP")
        if env_rtsp and not any(c.get("rtsp_source_url") == env_rtsp for c in self.config.get("cameras", [])):
            name = os.getenv("CAMERA_NAME", "Office Camera")
            print(f"[iLook] Registering camera feed: {name} ({env_rtsp})")
            reg = self.register_camera(name, env_rtsp)
            self.config["cameras"].append({
                "camera_id": reg["camera_id"], "cam_uid": reg["cam_uid"],
                "name": name, "rtsp_source_url": env_rtsp, "rtsp_push_url": reg["rtsp_push_url"]
            })
            self.save_config()

        for cam in self.config.get("cameras", []):
            print(f"[iLook] Starting outbound RTSP push for {cam['name']}...")
            p = StreamPipeline(cam["name"], cam["rtsp_source_url"], cam["rtsp_push_url"])
            self.pipelines[cam["camera_id"]] = p
            p.start()

        print("[iLook] Agent active. Streaming local cameras outbound without router port forwarding.")
        while True:
            time.sleep(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--code", help="6-digit pairing code")
    parser.add_argument("--cloud", help="Cloud URL")
    parser.add_argument("--rtsp", help="Local camera RTSP URL")
    parser.add_argument("--name", help="Camera name", default="Office Camera")
    args = parser.parse_args()
    if args.rtsp:
        os.environ["CAMERA_RTSP"] = args.rtsp
    if args.name:
        os.environ["CAMERA_NAME"] = args.name
    agent = StandaloneEdgeAgent(code=args.code, cloud=args.cloud)
    agent.run()
`;

  return new NextResponse(pythonScript, {
    headers: {
      "Content-Type": "text/x-python; charset=utf-8",
      "Content-Disposition": 'attachment; filename="agent.py"',
    },
  });
}
