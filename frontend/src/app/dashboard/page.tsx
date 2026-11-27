"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Video,
  Plus,
  Server,
  Grid,
  Square,
  LayoutGrid,
  LogOut,
  RefreshCw,
  Camera as CameraIcon,
  Trash2,
  ExternalLink,
  ChevronRight,
  Shield,
  BookOpen,
  Search,
  Monitor,
  Terminal,
  Activity,
  Layers,
  Radio,
  Check,
  Copy,
  ChevronDown,
  ChevronLeft,
  Sliders,
  Maximize2,
  Download
} from "lucide-react";
import { api, Camera, User } from "@/lib/api";
import WhepPlayer from "@/components/WhepPlayer";
import AddCameraModal from "@/components/AddCameraModal";
import PairEdgeModal from "@/components/PairEdgeModal";
import UserGuideModal from "@/components/UserGuideModal";
import AppFooter from "@/components/AppFooter";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridSize, setGridSize] = useState<1 | 2 | 3 | 4>(2); // 1x1, 2x2, 3x3, 4x4
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [pairingCode, setPairingCode] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>("https://ilooks.labstackops.top");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
    // Update live clock
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace("T", " ").substring(0, 19));
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const fetchUserDataAndCameras = useCallback(async () => {
    try {
      const me = await api.getMe();
      setUser(me);
      const camList = await api.getCameras();
      setCameras(camList);
    } catch (err) {
      console.error(err);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUserDataAndCameras();
    // Fetch a pairing code in background for quick onboarding hub
    api.generatePairCode("Quick Onboarding")
      .then((res) => setPairingCode(res.code))
      .catch(() => {});

    // Refresh camera status every 15s
    const interval = setInterval(async () => {
      try {
        const camList = await api.getCameras();
        setCameras(camList);
      } catch (e) {
        // ignore
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchUserDataAndCameras]);

  const handleLogout = () => {
    localStorage.removeItem("ilook_token");
    localStorage.removeItem("ilook_user");
    router.push("/login");
  };

  const handleDeleteCamera = async (camId: string) => {
    if (!confirm("Are you sure you want to remove this camera?")) return;
    try {
      await api.deleteCamera(camId);
      setCameras((prev) => prev.filter((c) => c.id !== camId));
      if (selectedCamera?.id === camId) setSelectedCamera(null);
    } catch (e: any) {
      alert(e.message || "Delete failed");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getGridColsClass = () => {
    if (selectedCamera) return "grid-cols-1";
    if (gridSize === 1) return "grid-cols-1";
    if (gridSize === 2) return "grid-cols-1 md:grid-cols-2";
    if (gridSize === 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  };

  const filteredCameras = cameras.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.cam_uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-mono tracking-wider">INITIALIZING iLOOK CLOUD VMS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070A11] text-gray-100 flex flex-col font-sans select-none">
      {/* TOP ENTERPRISE TOOLBAR (Hik-Connect / Dahua DSS Pro Style) */}
      <header className="h-16 border-b border-gray-800 bg-[#0B0F1C] px-5 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        {/* Brand & Live Gateway Telemetry */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition md:block"
            title="Toggle Device Tree"
          >
            <Layers className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <img
              src="/logo-icon.png"
              alt="iLooks-Connect"
              className="w-9 h-9 rounded-xl border border-emerald-500/40 object-contain shadow-md shadow-emerald-500/20"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-white text-sm leading-none tracking-tight">
                  iLooks<span className="text-[#10B981]">-Connect</span>
                </h1>
                <span className="hidden lg:inline-flex items-center gap-1 text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  stream.labstackops.top
                </span>
              </div>
              <span className="text-[10px] text-gray-400 tracking-wider uppercase font-semibold">ANYWHERE. ANYTIME.</span>
            </div>
          </div>
        </div>

        {/* Center: Live UTC Clock & Video Wall Layout Controls */}
        <div className="hidden md:flex items-center gap-4">
          <div className="text-xs font-mono text-gray-400 bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>{currentTime || "2026-11-27 19:20:00"}</span>
          </div>

          <div className="flex items-center bg-gray-950 p-1 rounded-xl border border-gray-800 gap-1">
            <button
              onClick={() => { setSelectedCamera(null); setGridSize(1); }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                gridSize === 1 && !selectedCamera ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"
              }`}
              title="Single Focus (1x1)"
            >
              <Square className="w-3.5 h-3.5" />
              <span className="text-[11px]">1x1</span>
            </button>
            <button
              onClick={() => { setSelectedCamera(null); setGridSize(2); }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                gridSize === 2 && !selectedCamera ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"
              }`}
              title="2x2 Quad"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="text-[11px]">2x2</span>
            </button>
            <button
              onClick={() => { setSelectedCamera(null); setGridSize(3); }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                gridSize === 3 && !selectedCamera ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"
              }`}
              title="3x3 Wall"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[11px]">3x3</span>
            </button>
            <button
              onClick={() => { setSelectedCamera(null); setGridSize(4); }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                gridSize === 4 && !selectedCamera ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"
              }`}
              title="4x4 Matrix"
            >
              <span className="text-[11px] font-bold">4x4</span>
            </button>
          </div>
        </div>

        {/* Action Buttons & Profile */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/download"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 hover:text-white text-xs font-semibold rounded-xl transition shadow-sm"
            title="Download Client Agent for Windows, Linux & Docker"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Install App</span>
          </Link>

          <button
            onClick={() => setIsGuideModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white text-xs font-medium rounded-xl transition"
            title="User Guide & Camera RTSP Manual"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">User Guide</span>
          </button>

          <button
            onClick={() => setIsPairModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold rounded-xl transition shadow-sm"
            title="Connect Local PC / Linux Edge Node"
          >
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Pair Edge Gateway</span>
            <span className="md:hidden">Pair</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#10B981] hover:bg-[#059669] text-gray-950 text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-500/25"
          >
            <Plus className="w-4 h-4 text-gray-950" />
            <span>Add Camera</span>
          </button>

          <div className="h-6 w-px bg-gray-800 mx-1 hidden sm:block" />

          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* WORKSPACE AREA: SIDEBAR + VIDEO WALL */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLLAPSIBLE LEFT DEVICE TREE (Hik-Connect / Dahua DSS Style) */}
        {isSidebarOpen && (
          <aside className="w-64 border-r border-gray-800 bg-[#0B0F1C]/80 backdrop-blur-md flex flex-col justify-between shrink-0 transition-all duration-300 z-20">
            <div className="p-4 space-y-4 overflow-y-auto">
              
              {/* Device Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter cameras..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-950 border border-gray-800 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Edge Gateway Status Link */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Local Edge Gateway
                </span>
                <a
                  href="http://localhost:8555"
                  target="_blank"
                  className="p-2.5 bg-gray-950 hover:bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between text-xs transition group"
                  title="Open Local Edge Console on your PC"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-semibold text-gray-200">Local Console</span>
                  </div>
                  <span className="text-[10px] text-blue-400 font-mono flex items-center gap-1">
                    :8555 <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </a>
              </div>

              {/* Connected Cameras Tree */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Camera Feeds ({filteredCameras.length})
                  </span>
                  {selectedCamera && (
                    <button
                      onClick={() => setSelectedCamera(null)}
                      className="text-[10px] text-blue-400 hover:underline"
                    >
                      Show All
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  {filteredCameras.map((cam, idx) => (
                    <button
                      key={cam.id}
                      onClick={() => setSelectedCamera(cam)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${
                        selectedCamera?.id === cam.id
                          ? "bg-blue-600/15 border-blue-500 text-white font-semibold"
                          : "bg-gray-950/60 hover:bg-gray-900 border-gray-800/80 text-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span className="truncate">{cam.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">CH{idx + 1}</span>
                    </button>
                  ))}

                  {filteredCameras.length === 0 && (
                    <div className="p-4 text-center text-xs text-gray-500 border border-dashed border-gray-800 rounded-xl">
                      No cameras connected yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Footer Telemetry */}
            <div className="p-4 border-t border-gray-800/80 bg-gray-950/50 text-[11px] font-mono text-gray-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>Protocol:</span>
                <span className="text-emerald-400">WebRTC WHEP</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Relay:</span>
                <span className="text-gray-200">Zero-Port TLS</span>
              </div>
            </div>
          </aside>
        )}

        {/* MAIN VIDEO WALL */}
        <main className="flex-1 p-5 overflow-y-auto">
          {cameras.length === 0 ? (
            /* PROFESSIONAL ONBOARDING HUB (Hik-Connect / Dahua DSS Pro Style) */
            <div className="max-w-5xl mx-auto py-8 space-y-8 animate-fade-in">
              
              {/* Hero Banner */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-blue-950/60 border border-blue-800/50 rounded-full text-xs text-blue-400 font-medium">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Enterprise Zero-Port-Forwarding Edge System</span>
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight">
                  Connect Your Local Cameras to iLook Cloud
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
                  Stream your local Hikvision, Dahua, CP Plus, and RTSP cameras locally on your LAN without internet lag, and monitor them globally from this portal.
                </p>
              </div>

              {/* Live Pairing Code Banner */}
              <div className="bg-[#0B0F1C] border border-indigo-500/30 rounded-2xl p-5 max-w-md mx-auto text-center space-y-2 shadow-xl shadow-indigo-950/20">
                <span className="text-xs text-gray-400 block font-medium">Your Active 6-Digit Pairing Key:</span>
                <div className="font-mono text-4xl font-black text-indigo-400 tracking-widest bg-gray-950 py-3 px-6 rounded-xl border border-gray-800 inline-block shadow-inner">
                  {pairingCode || "------"}
                </div>
                <p className="text-[11px] text-gray-500">
                  Use this key in your local Windows or Linux terminal to link your cameras.
                </p>
              </div>

              {/* THREE DEDICATED ONBOARDING CARDS (Windows vs Linux vs Direct RTSP) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* 1. WINDOWS SETUP */}
                <div className="bg-[#0D121F] border border-blue-800/40 hover:border-blue-500/60 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl transition group">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-xl">
                      <Monitor className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">Windows PC / Laptop</h3>
                      <span className="text-[11px] text-blue-400 font-semibold block">NO DOCKER REQUIRED</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Runs a background engine with a local web dashboard on <code className="text-blue-300 font-mono">http://localhost:8555</code>. Watch locally & sync to cloud!
                    </p>
                    
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] text-gray-400 font-medium block">PowerShell 1-Liner:</span>
                      <div className="relative">
                        <pre className="p-2.5 bg-gray-950 border border-gray-800 rounded-lg font-mono text-[11px] text-blue-300 overflow-x-auto pr-9">
                          irm {origin}/install.ps1 | iex
                        </pre>
                        <button
                          onClick={() => copyToClipboard(`irm ${origin}/install.ps1 | iex`, "win-cmd")}
                          className="absolute right-2 top-2 p-1 text-gray-400 hover:text-white"
                          title="Copy command"
                        >
                          {copiedKey === "win-cmd" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsPairModalOpen(true)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-blue-600/20"
                  >
                    Open Windows Setup Guide
                  </button>
                </div>

                {/* 2. LINUX / RASPBERRY PI */}
                <div className="bg-[#0D121F] border border-indigo-800/40 hover:border-indigo-500/60 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl transition group">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-xl">
                      <Terminal className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">Linux & Raspberry Pi</h3>
                      <span className="text-[11px] text-indigo-400 font-semibold block">DOCKER OR NATIVE SCRIPT</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Auto-detects Docker. If no Docker is installed, it runs natively using Python3 & FFmpeg in the background!
                    </p>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] text-gray-400 font-medium block">Terminal 1-Liner:</span>
                      <div className="relative">
                        <pre className="p-2.5 bg-gray-950 border border-gray-800 rounded-lg font-mono text-[11px] text-indigo-300 overflow-x-auto pr-9">
                          curl -sSL {origin}/install.sh | bash -s -- {pairingCode || "<CODE>"}
                        </pre>
                        <button
                          onClick={() => copyToClipboard(`curl -sSL ${origin}/install.sh | bash -s -- ${pairingCode || "<CODE>"}`, "linux-cmd")}
                          className="absolute right-2 top-2 p-1 text-gray-400 hover:text-white"
                          title="Copy command"
                        >
                          {copiedKey === "linux-cmd" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsPairModalOpen(true)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20"
                  >
                    Open Linux Setup Guide
                  </button>
                </div>

                {/* 3. DIRECT RTSP INGEST */}
                <div className="bg-[#0D121F] border border-gray-800 hover:border-gray-700 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl transition group">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xl">
                      <CameraIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">Direct RTSP Ingestion</h3>
                      <span className="text-[11px] text-emerald-400 font-semibold block">NVR & FFmpeg PUSH</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Generate individual RTSP push credentials for your camera and stream directly via FFmpeg, OBS, or NVR relay.
                    </p>

                    <div className="p-3 bg-gray-950 border border-gray-800 rounded-lg text-xs text-gray-400 space-y-1">
                      <span className="font-semibold text-white block">Compatible Brands:</span>
                      <span>Hikvision, Dahua, CP Plus, Uniview, Reolink, TP-Link Tapo, Axis.</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-emerald-600/20"
                  >
                    Add Camera Feed Directly
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE VIDEO WALL (Hik-Connect / Dahua DSS Tile Layout) */
            <div className="space-y-4">
              {/* Active Feed Status Bar */}
              <div className="flex items-center justify-between bg-[#0B0F1C] border border-gray-800 px-4 py-2.5 rounded-xl">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-gray-300 font-semibold">
                    {selectedCamera ? `Viewing ${selectedCamera.name}` : `All Feeds (${cameras.length} Active)`}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                  <span>Latency: &lt;200ms WHEP</span>
                  <span>&middot;</span>
                  <span>Relay: Encrypted TLS</span>
                </div>
              </div>

              {/* Video Grid */}
              <div className={`grid gap-4 ${getGridColsClass()}`}>
                {(selectedCamera ? [selectedCamera] : filteredCameras).map((camera, idx) => (
                  <div
                    key={camera.id}
                    className="relative group bg-[#0B0F1C] border border-gray-800 hover:border-gray-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                  >
                    {/* Camera Header Bar */}
                    <div className="h-9 bg-gray-950/80 px-3.5 border-b border-gray-800/80 flex items-center justify-between text-xs z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-red-500 bg-red-950/70 border border-red-800/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                          LIVE
                        </span>
                        <span className="font-bold text-white text-xs truncate max-w-[160px]">
                          {camera.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400">
                        <span className="text-blue-400 font-semibold">1080P</span>
                        <button
                          onClick={() => handleDeleteCamera(camera.id)}
                          className="text-gray-500 hover:text-red-400 p-1"
                          title="Remove Camera"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Live Video Player Tile */}
                    <div className="relative aspect-video bg-black flex items-center justify-center">
                      <WhepPlayer camera={camera} onDelete={handleDeleteCamera} />
                      
                      {/* Live Clock Stamp in Top Right corner of video */}
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-gray-300 pointer-events-none z-10">
                        {currentTime}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <AddCameraModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCameraAdded={(newCam) => {
          setCameras((prev) => [newCam, ...prev]);
        }}
        onOpenPairEdge={() => setIsPairModalOpen(true)}
        onOpenGuide={() => setIsGuideModalOpen(true)}
      />

      <PairEdgeModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        onPairSuccess={() => {
          fetchUserDataAndCameras();
        }}
        onOpenGuide={() => setIsGuideModalOpen(true)}
      />

      <UserGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onOpenPairModal={() => setIsPairModalOpen(true)}
      />

      <AppFooter />
    </div>
  );
}
