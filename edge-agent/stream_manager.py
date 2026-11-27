import subprocess
import threading
import time
import logging
from typing import Dict, Any

logger = logging.getLogger("iLook-Streamer")

class StreamPipeline:
    """Supervises an outbound FFmpeg RTSP-to-RTSP TCP pipeline."""
    
    def __init__(self, camera_name: str, local_rtsp: str, cloud_rtsp_push: str):
        self.camera_name = camera_name
        self.local_rtsp = local_rtsp
        self.cloud_rtsp_push = cloud_rtsp_push
        self.process: subprocess.Popen = None
        self.running = False
        self.thread: threading.Thread = None

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()

    def _run_loop(self):
        cmd = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel", "warning",
            "-nostats",
            "-rtsp_transport", "tcp",
            "-re",
            "-i", self.local_rtsp,
            "-c", "copy",
            "-f", "rtsp",
            "-rtsp_transport", "tcp",
            self.cloud_rtsp_push
        ]

        logger.info(f"[{self.camera_name}] Starting outbound RTSP push -> {self.cloud_rtsp_push.split('@')[-1]}")

        backoff = 3
        while self.running:
            try:
                self.process = subprocess.Popen(
                    cmd, 
                    stdout=subprocess.DEVNULL, 
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                # Wait for process exit or crash
                _, stderr = self.process.communicate()
                
                if self.running:
                    logger.warning(f"[{self.camera_name}] Stream exited (code {self.process.returncode}). Stderr: {stderr.strip() if stderr else 'None'}. Reconnecting in {backoff}s...")
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 30) # exponential backoff capped at 30s
            except Exception as e:
                logger.error(f"[{self.camera_name}] Pipeline error: {e}")
                time.sleep(5)

    def stop(self):
        self.running = False
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=3)
            except Exception:
                self.process.kill()


class StreamManager:
    """Manages active streaming pipelines for all cameras."""

    def __init__(self):
        self.pipelines: Dict[str, StreamPipeline] = {}

    def add_stream(self, cam_id: str, name: str, local_rtsp: str, push_url: str):
        if cam_id in self.pipelines:
            self.pipelines[cam_id].stop()

        pipeline = StreamPipeline(name, local_rtsp, push_url)
        self.pipelines[cam_id] = pipeline
        pipeline.start()

    def stop_all(self):
        for p in self.pipelines.values():
            p.stop()
        self.pipelines.clear()
