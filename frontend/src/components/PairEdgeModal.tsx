"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Server,
  CheckCircle2,
  RotateCw,
  Copy,
  Check,
  Terminal,
  Download,
  BookOpen,
  Monitor,
  Cpu,
  Layers
} from "lucide-react";
import { api } from "@/lib/api";

interface PairEdgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPairSuccess: () => void;
  onOpenGuide?: () => void;
}

export default function PairEdgeModal({
  isOpen,
  onClose,
  onPairSuccess,
  onOpenGuide,
}: PairEdgeModalProps) {
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isClaimed, setIsClaimed] = useState<boolean>(false);
  const [activeOs, setActiveOs] = useState<"linux" | "windows" | "docker" | "download">("linux");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>("https://ilooks.labstackops.top");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    let interval: any = null;

    if (isOpen && !code) {
      setLoading(true);
      api.generatePairCode("Customer Edge Node")
        .then((res) => {
          setCode(res.code);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }

    if (isOpen && code && !isClaimed) {
      interval = setInterval(async () => {
        try {
          const status = await api.checkPairStatus(code);
          if (status.is_claimed) {
            setIsClaimed(true);
            clearInterval(interval);
            setTimeout(() => {
              onPairSuccess();
              onClose();
            }, 2500);
          }
        } catch (e) {
          // ignore
        }
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, code, isClaimed, onClose, onPairSuccess]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const linuxCmd = `curl -sSL ${origin}/install.sh | bash -s -- ${code || "<CODE>"}`;
  const linuxCmdWithRtsp = `curl -sSL ${origin}/install.sh | bash -s -- ${code || "<CODE>"} "rtsp://10.10.13.50:8554/RTMP_186" "Office Camera"`;

  const windowsPowerShell = `irm ${origin}/install.ps1 | iex`;
  const windowsPython = `curl.exe -sSL ${origin}/api/v1/edge/download/agent.py -o agent.py
python agent.py --code ${code || "<CODE>"} --cloud ${origin} --rtsp "rtsp://10.10.13.50:8554/RTMP_186"`;

  const dockerRunCmd = `docker run -d --name ilook-edge --restart=always --network=host \\
  -e PAIRING_CODE="${code || "<CODE>"}" \\
  -e CLOUD_URL="${origin}" \\
  -e CAMERA_RTSP="rtsp://10.10.13.50:8554/RTMP_186" \\
  -e CAMERA_NAME="Office Camera" \\
  ilook/edge-agent:latest`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-gray-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Connect Local Cameras (Edge Node)</h3>
              <p className="text-xs text-gray-400">Zero-port-forwarding secure CCTV streaming</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OS Platform Selector Tabs */}
        <div className="grid grid-cols-4 border-b border-gray-800 bg-gray-950/40 shrink-0 text-center">
          <button
            onClick={() => setActiveOs("linux")}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeOs === "linux"
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Linux / Pi</span>
          </button>
          <button
            onClick={() => setActiveOs("windows")}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeOs === "windows"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Windows</span>
          </button>
          <button
            onClick={() => setActiveOs("docker")}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeOs === "docker"
                ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Docker</span>
          </button>
          <button
            onClick={() => setActiveOs("download")}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeOs === "download"
                ? "border-purple-500 text-purple-400 bg-purple-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Downloads</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Generating secure pairing key...</p>
            </div>
          ) : isClaimed ? (
            <div className="py-10 flex flex-col items-center gap-3 text-emerald-400 animate-bounce text-center">
              <CheckCircle2 className="w-14 h-14" />
              <h4 className="text-lg font-bold text-white">Edge Agent Paired Successfully!</h4>
              <p className="text-xs text-gray-400 max-w-sm">
                Your edge agent is connected. Registering local RTSP feeds and starting ultra-low latency WebRTC stream...
              </p>
            </div>
          ) : (
            <>
              {/* Pairing Code Banner */}
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1.5">Your 6-Digit Pairing Code:</p>
                <div className="inline-flex items-center justify-center font-mono text-3xl font-black tracking-widest text-indigo-400 bg-gray-950 py-2.5 px-8 rounded-xl border border-gray-800 shadow-inner">
                  {code ? code : "------"}
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] text-gray-500">
                  <RotateCw className="w-3 h-3 animate-spin text-indigo-400" />
                  <span>Waiting for edge agent to claim...</span>
                </div>
              </div>

              {/* TAB 1: LINUX / UBUNTU / RASPBERRY PI */}
              {activeOs === "linux" && (
                <div className="space-y-4 text-left">
                  <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-xs text-gray-300">
                    <span className="font-semibold text-white block mb-0.5">Auto-Detects Docker or Standalone Python:</span>
                    <span className="text-gray-400">
                      If Docker is installed, it runs a local container. <b>If NO Docker is installed</b>, it automatically runs in native Linux using Python3 and FFmpeg without any setup!
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-gray-300 block">
                      Run this 1-line command in your Linux terminal:
                    </span>
                    <div className="relative">
                      <pre className="p-3 bg-gray-950 border border-gray-800 rounded-lg font-mono text-xs text-indigo-300 overflow-x-auto pr-10">
                        {linuxCmdWithRtsp}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(linuxCmdWithRtsp, "linux-rtsp")}
                        className="absolute right-2 top-2 p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700"
                        title="Copy command"
                      >
                        {copiedId === "linux-rtsp" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-950/70 border border-gray-800/80 rounded-lg text-xs text-gray-400">
                    <p className="font-medium text-gray-300 mb-1">Or run without passing RTSP (it will prompt you in terminal):</p>
                    <code className="text-[11px] text-indigo-400 font-mono block select-all">
                      {linuxCmd}
                    </code>
                  </div>
                </div>
              )}

              {/* TAB 2: WINDOWS (NO DOCKER NEEDED) */}
              {activeOs === "windows" && (
                <div className="space-y-4 text-left">
                  <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200">
                    <span className="font-semibold text-white block mb-0.5">Windows Setup (No Docker Required!):</span>
                    <span className="text-blue-300/80">
                      You can run the iLook Edge Agent on any Windows 10/11 laptop or PC using PowerShell or Python.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-gray-300">
                      <span className="font-medium">Option A: 1-Line PowerShell Command (Run as Administrator):</span>
                    </div>
                    <div className="relative">
                      <pre className="p-3 bg-gray-950 border border-gray-800 rounded-lg font-mono text-xs text-blue-300 overflow-x-auto pr-10">
                        {windowsPowerShell}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(windowsPowerShell, "win-ps")}
                        className="absolute right-2 top-2 p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700"
                        title="Copy command"
                      >
                        {copiedId === "win-ps" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-gray-300 block">
                      Option B: Direct Python on Windows:
                    </span>
                    <div className="relative">
                      <pre className="p-3 bg-gray-950 border border-gray-800 rounded-lg font-mono text-xs text-gray-300 overflow-x-auto pr-10">
                        {windowsPython}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(windowsPython, "win-py")}
                        className="absolute right-2 top-2 p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700"
                        title="Copy script"
                      >
                        {copiedId === "win-py" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DOCKER CONTAINER */}
              {activeOs === "docker" && (
                <div className="space-y-3 text-left">
                  <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-xs text-gray-300">
                    <p className="font-semibold text-white mb-1">Private Docker Image (No Docker Hub Login Needed):</p>
                    <p className="text-gray-400">
                      Run the installer script, which automatically compiles the local image directly from this portal:
                    </p>
                  </div>

                  <div className="relative">
                    <pre className="p-3.5 bg-gray-950 border border-gray-800 rounded-lg font-mono text-xs text-emerald-300 overflow-x-auto pr-10 leading-relaxed">
                      curl -sSL {origin}/install.sh | bash -s -- {code || "<CODE>"}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(`curl -sSL ${origin}/install.sh | bash -s -- ${code || "<CODE>"}`, "docker-cmd")}
                      className="absolute right-2.5 top-2.5 p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700"
                    >
                      {copiedId === "docker-cmd" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: DIRECT DOWNLOADS */}
              {activeOs === "download" && (
                <div className="space-y-4 text-left">
                  <p className="text-xs text-gray-400">
                    Download scripts and packages directly from this portal to run on client machines:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a
                      href={`${origin}/install.sh`}
                      download="install.sh"
                      className="p-3 bg-gray-950 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-xl flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-xs text-white block">install.sh</span>
                        <span className="text-[10px] text-gray-400">Linux / Pi Installer</span>
                      </div>
                      <Download className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    </a>

                    <a
                      href={`${origin}/install.ps1`}
                      download="install.ps1"
                      className="p-3 bg-gray-950 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-xl flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-xs text-white block">install.ps1</span>
                        <span className="text-[10px] text-gray-400">Windows PowerShell Script</span>
                      </div>
                      <Download className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                    </a>

                    <a
                      href={`${origin}/api/v1/edge/download/agent.py`}
                      download="agent.py"
                      className="p-3 bg-gray-950 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-xl flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-xs text-white block">agent.py</span>
                        <span className="text-[10px] text-gray-400">Standalone Python Core</span>
                      </div>
                      <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </a>

                    <a
                      href={`${origin}/api/v1/edge/download/Dockerfile`}
                      download="Dockerfile"
                      className="p-3 bg-gray-950 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-xl flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-xs text-white block">Dockerfile</span>
                        <span className="text-[10px] text-gray-400">Docker Recipe</span>
                      </div>
                      <Download className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                    </a>
                  </div>
                </div>
              )}

              {/* Bottom Help Link */}
              <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
                <span className="text-gray-400">Need help finding your camera RTSP URL?</span>
                {onOpenGuide ? (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenGuide();
                    }}
                    className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>View Camera RTSP Guide</span>
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
