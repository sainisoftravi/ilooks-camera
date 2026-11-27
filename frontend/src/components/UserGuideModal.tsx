"use client";

import React, { useState } from "react";
import {
  X,
  BookOpen,
  Camera,
  Server,
  ShieldCheck,
  Terminal,
  HelpCircle,
  Copy,
  Check,
  ExternalLink,
  Cpu,
  Layers,
  ChevronRight
} from "lucide-react";

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPairModal?: () => void;
}

export default function UserGuideModal({
  isOpen,
  onClose,
  onOpenPairModal,
}: UserGuideModalProps) {
  const [activeTab, setActiveTab] = useState<"quickstart" | "rtsp" | "architecture" | "troubleshooting">("quickstart");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const cameraBrands = [
    {
      brand: "Hikvision",
      main: "rtsp://admin:password@<CAMERA_IP>:554/Streaming/Channels/101",
      sub: "rtsp://admin:password@<CAMERA_IP>:554/Streaming/Channels/102",
      notes: "101 = Main Stream (4K/1080p), 102 = Sub Stream (Recommended for multi-view walls).",
    },
    {
      brand: "Dahua / CP Plus",
      main: "rtsp://admin:password@<CAMERA_IP>:554/cam/realmonitor?channel=1&subtype=0",
      sub: "rtsp://admin:password@<CAMERA_IP>:554/cam/realmonitor?channel=1&subtype=1",
      notes: "subtype=0 is High-Res Main, subtype=1 is Low-Bitrate Sub.",
    },
    {
      brand: "Uniview (UNV)",
      main: "rtsp://admin:password@<CAMERA_IP>:554/unicast/c1/s0/live",
      sub: "rtsp://admin:password@<CAMERA_IP>:554/unicast/c1/s1/live",
      notes: "c1 = Camera 1, s0 = Main stream, s1 = Sub stream.",
    },
    {
      brand: "TP-Link Tapo",
      main: "rtsp://camera_account:password@<CAMERA_IP>:554/stream1",
      sub: "rtsp://camera_account:password@<CAMERA_IP>:554/stream2",
      notes: "Enable 'Camera Account' inside Tapo App > Settings > Advanced Settings > Camera Account.",
    },
    {
      brand: "Reolink",
      main: "rtsp://admin:password@<CAMERA_IP>:554/h264Preview_01_main",
      sub: "rtsp://admin:password@<CAMERA_IP>:554/h264Preview_01_sub",
      notes: "Ensure RTSP port 554 is enabled in Reolink Client > Network > Advanced > Port Settings.",
    },
    {
      brand: "Generic NVR / DVR",
      main: "rtsp://admin:password@<NVR_IP>:554/ch1/main",
      sub: "rtsp://admin:password@<NVR_IP>:554/ch1/sub",
      notes: "Replace 'ch1' with channel number (e.g., ch2, ch3, ch4) for multi-channel NVRs.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-gray-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">iLook Platform User & Deployment Guide</h2>
              <p className="text-xs text-gray-400">Zero-port-forwarding CCTV cloud streaming manual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-950/40 px-5 gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("quickstart")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "quickstart"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Quick Start Onboarding</span>
          </button>
          <button
            onClick={() => setActiveTab("rtsp")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "rtsp"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera RTSP Cheat Sheet</span>
          </button>
          <button
            onClick={() => setActiveTab("architecture")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "architecture"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero-Port Security</span>
          </button>
          <button
            onClick={() => setActiveTab("troubleshooting")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "troubleshooting"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Troubleshooting & FAQ</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-gray-300">
          {/* TAB 1: QUICKSTART */}
          {activeTab === "quickstart" && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 text-blue-200">
                <h3 className="font-semibold text-white text-sm mb-1">How iLook Edge Agent Works</h3>
                <p className="text-xs text-blue-300/90 leading-relaxed">
                  Traditional CCTV requires risky router port forwarding (opening port 554), exposing your local network to hackers. With iLook, the <b>Edge Agent</b> runs inside your local network (on a PC, Raspberry Pi, or local server), connects your local camera feeds, and sends encrypted streams outbound to the cloud. You can watch your cameras anywhere in the world with sub-second latency!
                </p>
              </div>

              {/* Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center mb-3">
                      1
                    </div>
                    <h4 className="font-semibold text-white text-sm mb-1.5">Get 6-Digit Code</h4>
                    <p className="text-xs text-gray-400">
                      Click the <b>Pair Edge Node</b> button in the top navbar. Your unique 6-digit pairing code is instantly generated.
                    </p>
                  </div>
                  {onOpenPairModal && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenPairModal();
                      }}
                      className="mt-4 text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                    >
                      Open Pairing Modal <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center mb-3">
                      2
                    </div>
                    <h4 className="font-semibold text-white text-sm mb-1.5">Run 1-Line Installer</h4>
                    <p className="text-xs text-gray-400">
                      On your local machine (Ubuntu, Debian, Raspberry Pi, or Mac), run the installer. It downloads directly from your portal without exposing GitHub!
                    </p>
                  </div>
                  <div className="mt-4 text-[11px] font-mono text-gray-500 bg-gray-900 p-2 rounded border border-gray-800 truncate">
                    curl -sSL .../agent.sh | bash
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mb-3">
                      3
                    </div>
                    <h4 className="font-semibold text-white text-sm mb-1.5">Watch Live Video</h4>
                    <p className="text-xs text-gray-400">
                      Your local cameras will instantly show up on the dashboard video wall in real-time WebRTC WHEP with low latency.
                    </p>
                  </div>
                  <div className="mt-4 text-xs text-emerald-400 font-medium flex items-center gap-1">
                    ✓ Ultra-low latency (&lt;200ms)
                  </div>
                </div>
              </div>

              {/* Commands for Linux & Windows Without Docker */}
              <div className="space-y-4">
                <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-blue-400">
                  How to Use on Linux & Windows (No Docker Required):
                </h4>

                {/* Linux No Docker */}
                <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs">🐧 Linux / Raspberry Pi / Ubuntu (Without Docker):</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `curl -sSL https://ilooks.labstackops.top/install.sh | bash -s -- <YOUR_CODE> "rtsp://YOUR_CAMERA_IP:554/stream" "Office Camera"`,
                          "guide-linux"
                        )
                      }
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {copiedText === "guide-linux" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === "guide-linux" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 bg-gray-900 border border-gray-800 rounded font-mono text-xs text-indigo-300 overflow-x-auto">
                    curl -sSL https://ilooks.labstackops.top/install.sh | bash -s -- &lt;PAIRING_CODE&gt; &quot;rtsp://10.10.13.50:8554/RTMP_186&quot; &quot;Office Camera&quot;
                  </pre>
                  <p className="text-[11px] text-gray-400">
                    Auto-installs Python3 & FFmpeg if needed and runs silently in the background (`~/.ilook-edge/agent.log`).
                  </p>
                </div>

                {/* Windows No Docker */}
                <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs">🪟 Windows 10 / 11 (Without Docker):</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `irm https://ilooks.labstackops.top/install.ps1 | iex`,
                          "guide-win"
                        )
                      }
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {copiedText === "guide-win" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === "guide-win" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-300">Open PowerShell and run:</p>
                  <pre className="p-2.5 bg-gray-900 border border-gray-800 rounded font-mono text-xs text-blue-300 overflow-x-auto">
                    irm https://ilooks.labstackops.top/install.ps1 | iex
                  </pre>
                  <p className="text-[11px] text-gray-400">
                    Or download <b>agent.py</b> from the portal and run <code className="text-blue-400 font-mono">python agent.py --code &lt;CODE&gt; --rtsp &quot;rtsp://...&quot;</code>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RTSP CHEAT SHEET */}
          {activeTab === "rtsp" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-300 space-y-1">
                <p className="font-semibold text-white">How to construct your camera RTSP URL:</p>
                <p className="text-gray-400">
                  Replace <code className="text-blue-400">&lt;CAMERA_IP&gt;</code> with your camera&apos;s local IP (e.g. 192.168.1.50) and update the username/password.
                </p>
              </div>

              <div className="space-y-3">
                {cameraBrands.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{item.brand}</span>
                      <span className="text-[11px] text-gray-400 italic">{item.notes}</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between bg-gray-900/80 p-2 rounded-lg border border-gray-800">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">
                            Main Stream
                          </span>
                          <code className="text-xs text-gray-200 font-mono truncate">{item.main}</code>
                        </div>
                        <button
                          onClick={() => copyToClipboard(item.main, `main-${idx}`)}
                          className="p-1 text-gray-400 hover:text-white"
                          title="Copy RTSP"
                        >
                          {copiedText === `main-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between bg-gray-900/80 p-2 rounded-lg border border-gray-800">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                            Sub Stream
                          </span>
                          <code className="text-xs text-gray-200 font-mono truncate">{item.sub}</code>
                        </div>
                        <button
                          onClick={() => copyToClipboard(item.sub, `sub-${idx}`)}
                          className="p-1 text-gray-400 hover:text-white"
                          title="Copy RTSP"
                        >
                          {copiedText === `sub-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ARCHITECTURE */}
          {activeTab === "architecture" && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-200">
                <h3 className="font-semibold text-white text-sm mb-1">Enterprise Zero-Port-Forwarding Guarantee</h3>
                <p className="text-xs text-emerald-300/90 leading-relaxed">
                  Your local security cameras are strictly isolated from the public internet. No inbound router ports (Port 554, 80, 8080) are ever exposed. All connections are outbound-only through an encrypted channel to the iLook Media Gateway.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2">
                  <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-blue-400">
                    Client Edge Security
                  </h4>
                  <ul className="text-xs text-gray-300 space-y-2 list-disc list-inside">
                    <li>Outbound-only connection: Never opens a listening port on your router.</li>
                    <li>Operates inside private LAN (behind NAT, CGNAT, or 4G/5G mobile dongles).</li>
                    <li>Secure token-based node pairing: Revoke any edge device with one click.</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2">
                  <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-indigo-400">
                    Cloud Media Transport
                  </h4>
                  <ul className="text-xs text-gray-300 space-y-2 list-disc list-inside">
                    <li>RTSP Ingest via TLS/TCP to Cloud Media Gateway.</li>
                    <li>Playback served through WebRTC WHEP protocol (sub-second latency).</li>
                    <li>Cross-browser support on iOS Safari, Android Chrome, Mac, and Windows.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TROUBLESHOOTING */}
          {activeTab === "troubleshooting" && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2">
                <h4 className="font-semibold text-white text-sm">1. Camera feed is black or shows &quot;Reconnecting&quot;</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  • Verify the camera RTSP URL works inside your local network. You can test it by opening <b>VLC Media Player &gt; Media &gt; Open Network Stream</b> and pasting the RTSP link.<br />
                  • Ensure the camera&apos;s username and password in the RTSP URL are correct.<br />
                  • Check if the camera requires ONVIF or RTSP to be explicitly enabled in its settings web UI.
                </p>
              </div>

              <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2">
                <h4 className="font-semibold text-white text-sm">2. How to check edge agent logs</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  If running in Docker:
                </p>
                <pre className="p-2.5 bg-gray-900 border border-gray-800 rounded font-mono text-xs text-gray-300">
                  docker logs -f ilook-edge
                </pre>
                <p className="text-xs text-gray-400 leading-relaxed pt-1">
                  If running as standalone Python:
                </p>
                <pre className="p-2.5 bg-gray-900 border border-gray-800 rounded font-mono text-xs text-gray-300">
                  cat ~/.ilook-edge/agent.log
                </pre>
              </div>

              <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl space-y-2">
                <h4 className="font-semibold text-white text-sm">3. Pairing Code Expired</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Pairing codes expire after 15 minutes for security. Simply close the pairing window and click <b>Pair Edge Node</b> again to get a fresh code.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/60 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500">
            iLook Cloud Video Surveillance • Stream Gateway: <span className="text-gray-400 font-mono">stream.labstackops.top</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/20"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
