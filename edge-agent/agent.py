import os
import sys
import json
import time
import logging
import threading
import requests
from onvif_scanner import OnvifScanner
from stream_manager import StreamManager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("iLook-Agent")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CONFIG_PATH = os.path.join(DATA_DIR, "config.json")

class EdgeAgent:
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        self.cloud_url = os.getenv("CLOUD_URL", "https://ilook.labstackops.top").rstrip("/")
        self.node_token = None
        self.node_id = None
        self.config = self.load_config()
        self.stream_manager = StreamManager()
        self.running = True

    def load_config(self) -> dict:
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, "r") as f:
                    data = json.load(f)
                    self.node_token = data.get("node_token")
                    self.node_id = data.get("node_id")
                    return data
            except Exception as e:
                logger.error(f"Could not read config: {e}")
        return {"node_id": None, "node_token": None, "cameras": []}

    def save_config(self):
        self.config["node_id"] = self.node_id
        self.config["node_token"] = self.node_token
        with open(CONFIG_PATH, "w") as f:
            json.dump(self.config, f, indent=2)

    def pair_with_cloud(self):
        """Pairs this edge agent with user account using 6-digit code."""
        if self.node_token and self.node_id:
            logger.info(f"Loaded existing edge credentials. Node ID: {self.node_id}")
            return

        pairing_code = os.getenv("PAIRING_CODE")
        if not pairing_code:
            print("\n" + "="*60)
            print("  iLook Edge Agent - Initial Pairing Setup")
            print("="*60)
            print("Log in to https://ilook.labstackops.top and click 'Pair Edge Node'")
            print("to get your 6-digit pairing code.\n")
            pairing_code = input("Enter 6-digit Pairing Code: ").strip()

        logger.info(f"Submitting pairing code '{pairing_code}' to {self.cloud_url}...")
        
        try:
            resp = requests.post(
                f"{self.cloud_url}/api/v1/edge/pair/claim",
                json={
                    "code": pairing_code,
                    "node_name": os.getenv("NODE_NAME", "Local Edge Node"),
                    "version": "1.0.0"
                },
                timeout=10
            )
            resp.raise_for_status()
            data = resp.json()
            self.node_id = data["edge_node_id"]
            self.node_token = data["node_token"]
            self.save_config()
            logger.info("Pairing successful! Credentials stored safely.")
        except Exception as e:
            logger.error(f"Failed to claim pairing code: {e}")
            sys.exit(1)

    def start_heartbeat(self):
        """Periodic heartbeat loop."""
        def heartbeat_worker():
            while self.running:
                try:
                    requests.post(
                        f"{self.cloud_url}/api/v1/edge/heartbeat",
                        headers={"X-Node-Token": self.node_token},
                        json={"version": "1.0.0"},
                        timeout=5
                    )
                except Exception as e:
                    logger.debug(f"Heartbeat error: {e}")
                time.sleep(30)

        t = threading.Thread(target=heartbeat_worker, daemon=True)
        t.start()

    def register_camera(self, name: str, rtsp_source: str, ip: str = None, port: int = 80) -> dict:
        """Registers a camera to cloud and obtains unique RTSP push URL."""
        resp = requests.post(
            f"{self.cloud_url}/api/v1/edge/cameras/register",
            headers={"X-Node-Token": self.node_token},
            json={
                "name": name,
                "onvif_ip": ip,
                "onvif_port": port,
                "rtsp_source_url": rtsp_source
            },
            timeout=10
        )
        resp.raise_for_status()
        return resp.json()

    def run_discovery_and_ingestion(self):
        """Scans LAN and starts outbound RTSP push for all cameras."""
        # 1. Start existing configured cameras
        for cam in self.config.get("cameras", []):
            logger.info(f"Restoring stream for: {cam['name']}")
            self.stream_manager.add_stream(
                cam["camera_id"],
                cam["name"],
                cam["rtsp_source_url"],
                cam["rtsp_push_url"]
            )

        # 2. Check for manual RTSP cameras passed via env (e.g. CAMERA_RTSP_1=rtsp://...)
        env_rtsp = os.getenv("CAMERA_RTSP")
        if env_rtsp and not any(c.get("rtsp_source_url") == env_rtsp for c in self.config.get("cameras", [])):
            name = os.getenv("CAMERA_NAME", "Local RTSP Camera")
            logger.info(f"Registering camera from environment: {name} -> {env_rtsp}")
            try:
                reg = self.register_camera(name, env_rtsp)
                cam_record = {
                    "camera_id": reg["camera_id"],
                    "cam_uid": reg["cam_uid"],
                    "name": name,
                    "rtsp_source_url": env_rtsp,
                    "rtsp_push_url": reg["rtsp_push_url"]
                }
                self.config["cameras"].append(cam_record)
                self.save_config()
                self.stream_manager.add_stream(
                    reg["camera_id"],
                    name,
                    env_rtsp,
                    reg["rtsp_push_url"]
                )
            except Exception as e:
                logger.error(f"Error registering manual RTSP camera: {e}")

        # 3. ONVIF Scan
        if os.getenv("ENABLE_ONVIF_SCAN", "true").lower() == "true":
            devices = OnvifScanner.discover_devices(timeout=5)
            for dev in devices:
                logger.info(f"Found ONVIF Camera at IP {dev['ip']}:{dev['port']}")

        logger.info("iLook Edge Agent running. Press Ctrl+C to terminate.")
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Stopping iLook Edge Agent...")
            self.running = False
            self.stream_manager.stop_all()

    def run(self):
        self.pair_with_cloud()
        self.start_heartbeat()
        self.run_discovery_and_ingestion()

if __name__ == "__main__":
    agent = EdgeAgent()
    agent.run()
