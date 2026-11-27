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
  HelpCircle,
  Layers,
  ChevronRight
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
  const [activeTab, setActiveTab] = useState<"quick" | "docker" | "download">("quick");
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

  const oneLineCommand = `curl -sSL ${origin}/api/v1/edge/agent.sh | bash -s -- ${code || "<CODE>"}`;
  const oneLineWithRtsp = `curl -sSL ${origin}/api/v1/edge/agent.sh | bash -s -- ${code || "<CODE>"} "rtsp://admin:pass@192.168.1.100:554/Streaming/Channels/101" "Office Camera"`;

  const manualDockerCommands = `mkdir -p ~/.ilook-edge && cd ~/.ilook-edge
curl -sSL ${origin}/api/v1/edge/download/agent.py -o agent.py
curl -sSL ${origin}/api/v1/edge/download/Dockerfile -o Dockerfile
docker build -t ilook/edge-agent:latest .
docker run -d --name ilook-edge --restart=always --network=host \\
  -e PAIRING_CODE="${code || "<CODE>"}" \\
  -e CLOUD_URL="${origin}" \\
  -e CAMERA_RTSP="rtsp://admin:pass@192.168.1.100:554/Streaming/Channels/101" \\
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
              <h3 className="font-semibold text-white">Pair Local Edge Agent</h3>
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

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 border-b border-gray-800 bg-gray-950/40 shrink-0">
          <button
            onClick={() => setActiveTab("quick")}
            className={`py-2.5 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "quick"
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>1-Line Auto Install</span>
          </button>
          <button
            onClick={() => setActiveTab("docker")}
            className={`py-2.5 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "docker"
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Manual Docker Build</span>
          </button>
          <button
            onClick={() => setActiveTab("download")}
            className={`py-2.5 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "download"
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Files</span>
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
                Your local agent is connected. Registering camera feeds and launching low-latency streams...
              </p>
            </div>
          ) : (
            <>
              {/* Pairing Code Banner */}
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-2">
                  Enter this 6-digit code on your local edge agent or use the command below:
                </p>
                <div className="inline-flex items-center justify-center font-mono text-3xl font-black tracking-widest text-indigo-400 bg-gray-950 py-3 px-8 rounded-xl border border-gray-800 shadow-inner">
                  {code ? code : "------"}
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] text-gray-500">
                  <RotateCw className="w-3 h-3 animate-spin text-indigo-400" />
                  <span>Waiting for edge agent to claim pairing code...</span>
                </div>
              </div>

              {/* TAB 1: QUICK 1-LINE INSTALL */}
              {activeTab === "quick" && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200">
                    <p className="font-semibold text-white mb-1">Direct from Portal (No GitHub Repo Access Needed):</p>
                    <p className="text-indigo-300/80">
                      Run this command on your local machine (Ubuntu, Debian, Raspberry Pi). It downloads the agent from this portal, builds a lightweight local container, and starts streaming.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-300">
                      <span className="font-medium">Option A: Quick Setup (Prompts for Camera RTSP in terminal):</span>
                    </div>
                    <div className="relative">
                      <pre className="p-3 bg-gray-950 border border-gray-800 rounded-lg font-mono text-xs text-indigo-300 overflow-x-auto pr-10">
                        {oneLineCommand}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(oneLineCommand, "opt-a")}
                        className="absolute right-2 top-2 p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700"
                        title="Copy command"
                      >
                        {copiedId === "opt-a" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-300">
                      <span className="font-medium">Option B: Instant Setup with Camera RTSP URL:</span>
                    </div>
                    <div className="relative">
                      <pre className="p-3 bg-gray-950 border border-gray-800 rounded-lg font-mono text-xs text-indigo-300 overflow-x-auto pr-10">
                        {oneLineWithRtsp}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(oneLineWithRtsp, "opt-b")}
                        className="absolute right-2 top-2 p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700"
                        title="Copy command"
                      >
                        {copiedId === "opt-b" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MANUAL DOCKER BUILD */}
              {activeTab === "docker" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-xs text-gray-300">
                    <p className="font-semibold text-white mb-1">Zero GitHub / Zero Docker Hub Login Required:</p>
                    <p className="text-gray-400">
                      Because the agent is hosted securely on this server, you download the agent and Dockerfile directly from this portal and build it locally.
                    </p>
                  </div>

                  <div className="relative">
                    <pre className="p-3.5 bg-gray-950 border border-gray-800 rounded-lg font-mono text-xs text-gray-300 overflow-x-auto pr-10 leading-relaxed">
                      {manualDockerCommands}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(manualDockerCommands, "docker-script")}
                      className="absolute right-2.5 top-2.5 p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700"
                      title="Copy script"
                    >
                      {copiedId === "docker-script" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: DOWNLOAD FILES */}
              {activeTab === "download" && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400">
                    Download standalone scripts and configs directly from this portal to run on any computer or Raspberry Pi:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a
                      href={`${origin}/api/v1/edge/agent.sh`}
                      download="agent.sh"
                      className="p-3 bg-gray-950 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-xl flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-xs text-white block">agent.sh</span>
                        <span className="text-[10px] text-gray-400">Automated Shell Installer</span>
                      </div>
                      <Download className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    </a>

                    <a
                      href={`${origin}/api/v1/edge/download/agent.py`}
                      download="agent.py"
                      className="p-3 bg-gray-950 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-xl flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-xs text-white block">agent.py</span>
                        <span className="text-[10px] text-gray-400">Standalone Python Engine</span>
                      </div>
                      <Download className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    </a>

                    <a
                      href={`${origin}/api/v1/edge/download/Dockerfile`}
                      download="Dockerfile"
                      className="p-3 bg-gray-950 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-xl flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-xs text-white block">Dockerfile</span>
                        <span className="text-[10px] text-gray-400">Local Docker Container</span>
                      </div>
                      <Download className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    </a>

                    <a
                      href={`${origin}/api/v1/edge/download/docker-compose.yml`}
                      download="docker-compose.yml"
                      className="p-3 bg-gray-950 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-xl flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-xs text-white block">docker-compose.yml</span>
                        <span className="text-[10px] text-gray-400">Compose Orchestration</span>
                      </div>
                      <Download className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    </a>
                  </div>

                  <div className="p-3 bg-gray-950 border border-gray-800 rounded-lg text-xs text-gray-400 space-y-1">
                    <span className="font-semibold text-white block">To run without Docker using Python:</span>
                    <code className="block font-mono text-[11px] text-indigo-300">
                      python3 agent.py --code {code || "<CODE>"} --cloud {origin}
                    </code>
                  </div>
                </div>
              )}

              {/* Help Banner at Bottom */}
              <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
                <span className="text-gray-400">Don&apos;t know your camera RTSP URL?</span>
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
