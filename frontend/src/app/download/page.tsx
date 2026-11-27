"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Monitor,
  Terminal,
  Layers,
  HardDrive,
  Activity,
  CheckCircle2,
  Copy,
  Check,
  Download,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Video,
  Radio,
  Clock,
  Cpu,
  RotateCw,
  ExternalLink
} from "lucide-react";
import AppFooter from "@/components/AppFooter";

export default function DownloadPage() {
  const [activeTab, setActiveTab] = useState<"windows" | "linux" | "docker">("windows");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://ilooks.labstackops.top");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const winCommand = `irm ${origin}/install.ps1 | iex`;
  const linuxCommand = `curl -sSL ${origin}/install.sh | sudo bash`;
  const dockerCommand = `docker run -d --name ilook-edge --restart=always --network=host \\
  -v ~/.ilook-edge/recordings:/app/recordings \\
  -e CLOUD_URL="${origin}" \\
  -e LOCAL_PORT="8090" \\
  ilook/edge-agent:latest`;

  return (
    <div className="min-h-screen bg-[#070A0F] text-gray-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black font-sans">
      {/* Top Navbar */}
      <header className="h-16 border-b border-gray-800 bg-[#0B0F19] px-6 flex items-center justify-between sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <img
            src="/logo-icon.png"
            alt="iLooks-Connect"
            className="w-9 h-9 rounded-xl border border-emerald-500/40 object-contain shadow-md shadow-emerald-500/20"
          />
          <div>
            <h1 className="font-extrabold text-white text-base leading-none tracking-tight">
              iLooks<span className="text-[#10B981]">-Connect</span>
            </h1>
            <span className="text-[10px] text-gray-400 tracking-wider uppercase font-semibold">
              ANYWHERE. ANYTIME.
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 hover:text-white transition flex items-center gap-1.5"
          >
            <span>Back to Video Wall</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto p-6 sm:p-10 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-emerald-950/80 border border-emerald-500/40 rounded-full text-xs text-emerald-400 font-semibold shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Radio className="w-3.5 h-3.5" />
            <span>Hikvision, CP Plus, Dahua & ONVIF Auto-Discovery</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Install iLooks-Connect Client Agent
          </h1>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
            Runs silently on your local PC, Mini-PC, or server. Automatically scans your LAN for cameras, manages 24/7 loop recordings on your hard drive, and relays encrypted video to your cloud dashboard without router port forwarding.
          </p>
        </div>

        {/* Operating System Selector Tabs */}
        <div className="bg-[#101622] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto p-1 bg-gray-950 rounded-2xl border border-gray-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab("windows")}
              className={`py-3 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === "windows"
                  ? "bg-[#10B981] text-gray-950 shadow-lg shadow-emerald-500/25"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Windows</span>
            </button>

            <button
              onClick={() => setActiveTab("linux")}
              className={`py-3 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === "linux"
                  ? "bg-[#10B981] text-gray-950 shadow-lg shadow-emerald-500/25"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Linux / Pi</span>
            </button>

            <button
              onClick={() => setActiveTab("docker")}
              className={`py-3 rounded-xl flex items-center justify-center gap-2 transition ${
                activeTab === "docker"
                  ? "bg-[#10B981] text-gray-950 shadow-lg shadow-emerald-500/25"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Docker</span>
            </button>
          </div>

          {/* TAB 1: WINDOWS */}
          {activeTab === "windows" && (
            <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-white text-sm">Non-Technical Windows Single-Command Setup:</h4>
                  <p className="text-gray-300 leading-relaxed">
                    Open PowerShell and run the command below. It sets up the background agent, registers auto-start on Windows boot, and automatically opens your local configuration wizard at <code className="text-emerald-400 font-mono">http://localhost:8090</code>.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-300">Run in Windows PowerShell:</span>
                <div className="relative">
                  <pre className="p-4 bg-gray-950 border border-gray-800 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto pr-12">
                    {winCommand}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(winCommand, "win-cmd")}
                    className="absolute right-3 top-3 p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition"
                    title="Copy command"
                  >
                    {copiedKey === "win-cmd" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-gray-950 border border-gray-800/80 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-white block">1. Boot Auto-Start</span>
                  <span className="text-gray-400 text-[11px]">Silently runs in system tray on PC startup</span>
                </div>
                <div className="p-3 bg-gray-950 border border-gray-800/80 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-white block">2. Local Wizard (:8090)</span>
                  <span className="text-gray-400 text-[11px]">Scan LAN & configure cameras in 1 click</span>
                </div>
                <div className="p-3 bg-gray-950 border border-gray-800/80 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-white block">3. Local Hard Drive Loop</span>
                  <span className="text-gray-400 text-[11px]">Saves 5-min chunks with auto-overwrite</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LINUX */}
          {activeTab === "linux" && (
            <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Terminal className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-white text-sm">Systemd Background Service (Ubuntu / Debian / Raspberry Pi):</h4>
                  <p className="text-gray-300 leading-relaxed">
                    Installs as a production system service (<code className="text-emerald-400 font-mono">systemctl enable --now ilooks-agent</code>). Starts automatically on boot and recovers instantly from power outages.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-300">Run in Linux Terminal:</span>
                <div className="relative">
                  <pre className="p-4 bg-gray-950 border border-gray-800 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto pr-12">
                    {linuxCommand}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(linuxCommand, "linux-cmd")}
                    className="absolute right-3 top-3 p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition"
                    title="Copy command"
                  >
                    {copiedKey === "linux-cmd" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOCKER */}
          {activeTab === "docker" && (
            <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-white text-sm">Multi-Arch Docker (Synology NAS / QNAP / Proxmox):</h4>
                  <p className="text-gray-300 leading-relaxed">
                    Uses <code className="text-emerald-400 font-mono">--network=host</code> so ONVIF UDP multicast discovery (port 3702) can locate physical cameras on your local 192.168.x.x subnet.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-300">Docker Run Command:</span>
                <div className="relative">
                  <pre className="p-4 bg-gray-950 border border-gray-800 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto pr-12">
                    {dockerCommand}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(dockerCommand, "docker-cmd")}
                    className="absolute right-3 top-3 p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition"
                    title="Copy command"
                  >
                    {copiedKey === "docker-cmd" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Real-World Feature Architecture Cards */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Enterprise CCTV Engine Built Into Every Agent
            </h2>
            <p className="text-xs text-gray-400">
              Hardware-grade reliability for professional installations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <div className="p-6 bg-[#101622] border border-gray-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">A. Zero-Config LAN Scanner</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Broadcasts WS-Discovery (239.255.255.250:3702) to find all Hikvision, CP Plus, Dahua, and Uniview cameras on your switch. Auto-probes RTSP credentials with zero manual typing.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-[#101622] border border-gray-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">B. Dual-Stream Cloud Relay</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Pushes sub-stream continuously for low-bandwidth multi-camera video walls (~300 kbps), and dynamically wakes up HD Main-stream (4K/1080p) on single-focus, saving 80% upload data.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-[#101622] border border-gray-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">C. Local NVR Loop Recording</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Saves 5-minute chunked fMP4 recordings directly to your local PC hard drive or NAS using <code className="text-emerald-400">ffmpeg -c copy</code> (0% CPU load). Automatic FIFO disk overwrite at 90% capacity.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 bg-[#101622] border border-gray-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">D. Remote Timeline Playback</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Scrub historical footage from yesterday on your mobile browser. The client agent streams local recordings on demand without requiring router port forwarding.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 bg-[#101622] border border-gray-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">E. Auto-Start & Watchdog</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Recovers automatically after power failures. Pings cameras every 15 seconds; if a camera is disconnected, triggers an instant Video Loss alert on your dashboard.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 bg-[#101622] border border-gray-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">F. Zero Port Forwarding</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Never open port 554, 80, or 8080 on your internet router. All video packets travel outbound through end-to-end encrypted TLS tunnels to the cloud media gateway.
              </p>
            </div>
          </div>
        </div>

        {/* Hikvision & CP Plus DVR Syntax Reference Table */}
        <div className="bg-[#101622] border border-gray-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Camera & DVR Channel RTSP Syntax Reference</span>
            </h3>
            <span className="text-xs text-gray-500">Auto-configured in Agent Setup Wizard</span>
          </div>

          <div className="overflow-x-auto text-xs font-mono">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="py-2.5">Brand</th>
                  <th className="py-2.5">Main Stream (HD)</th>
                  <th className="py-2.5">Sub Stream (Grid View)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-gray-300">
                <tr>
                  <td className="py-2.5 font-bold text-white">Hikvision</td>
                  <td>rtsp://admin:pass@&lt;IP&gt;:554/Streaming/Channels/101</td>
                  <td className="text-emerald-400">rtsp://admin:pass@&lt;IP&gt;:554/Streaming/Channels/102</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-white">Dahua / CP Plus</td>
                  <td>rtsp://admin:pass@&lt;IP&gt;:554/cam/realmonitor?channel=1&amp;subtype=0</td>
                  <td className="text-emerald-400">rtsp://admin:pass@&lt;IP&gt;:554/cam/realmonitor?channel=1&amp;subtype=1</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-white">Uniview (UNV)</td>
                  <td>rtsp://admin:pass@&lt;IP&gt;:554/unicast/c1/s0/live</td>
                  <td className="text-emerald-400">rtsp://admin:pass@&lt;IP&gt;:554/unicast/c1/s1/live</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-white">TP-Link Tapo</td>
                  <td>rtsp://camera_account:pass@&lt;IP&gt;:554/stream1</td>
                  <td className="text-emerald-400">rtsp://camera_account:pass@&lt;IP&gt;:554/stream2</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-white">Multi-CH NVR</td>
                  <td>rtsp://admin:pass@&lt;NVR_IP&gt;:554/ch1/main</td>
                  <td className="text-emerald-400">rtsp://admin:pass@&lt;NVR_IP&gt;:554/ch1/sub</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
