"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Shield
} from "lucide-react";
import { api, Camera, User } from "@/lib/api";
import WhepPlayer from "@/components/WhepPlayer";
import AddCameraModal from "@/components/AddCameraModal";
import PairEdgeModal from "@/components/PairEdgeModal";
import AppFooter from "@/components/AppFooter";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridSize, setGridSize] = useState<1 | 2 | 3>(2); // 1x1, 2x2, 3x3
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);

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

  const getGridColsClass = () => {
    if (gridSize === 1) return "grid-cols-1";
    if (gridSize === 2) return "grid-cols-1 md:grid-cols-2";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Loading iLook Video Wall...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-gray-800 bg-gray-950/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-none">iLook</h1>
            <span className="text-[10px] text-gray-400 font-mono">stream.labstackops.top</span>
          </div>
        </div>

        {/* Center Grid Selector Controls */}
        <div className="hidden sm:flex items-center bg-gray-900 p-1 rounded-xl border border-gray-800 gap-1">
          <button
            onClick={() => setGridSize(1)}
            className={`p-1.5 rounded-lg transition-colors ${
              gridSize === 1 ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
            }`}
            title="Single Focus (1x1)"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => setGridSize(2)}
            className={`p-1.5 rounded-lg transition-colors ${
              gridSize === 2 ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
            }`}
            title="2x2 Grid"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setGridSize(3)}
            className={`p-1.5 rounded-lg transition-colors ${
              gridSize === 3 ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
            }`}
            title="3x3 Wall"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons & Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPairModalOpen(true)}
            className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-indigo-400 text-xs font-medium rounded-xl transition-colors"
          >
            <Server className="w-3.5 h-3.5" />
            <span>Pair Edge Node</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Camera</span>
          </button>

          <div className="h-6 w-px bg-gray-800 mx-1 hidden sm:block" />

          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 p-6 max-w-[1800px] w-full mx-auto">
        {cameras.length === 0 ? (
          /* Empty State */
          <div className="h-[70vh] flex flex-col items-center justify-center text-center p-8 border border-dashed border-gray-800 rounded-3xl bg-gray-950/40">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20 mb-4">
              <CameraIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No Cameras Connected Yet</h3>
            <p className="text-xs text-gray-400 max-w-md mb-6 leading-relaxed">
              Add your IP cameras using direct RTSP ingestion credentials or connect your local Raspberry Pi / Docker edge agent for zero-port-forwarding ONVIF discovery.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" /> Add Camera
              </button>
              <button
                onClick={() => setIsPairModalOpen(true)}
                className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-200 text-xs font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                <Server className="w-4 h-4 text-indigo-400" /> Pair Edge Agent
              </button>
            </div>
          </div>
        ) : (
          /* Multi-Camera Live Grid */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-gray-200">Live Video Wall</h2>
                <span className="text-xs bg-gray-900 text-gray-400 px-2 py-0.5 rounded-full border border-gray-800">
                  {cameras.length} Active Feeds
                </span>
              </div>
              <button
                onClick={fetchUserDataAndCameras}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh List
              </button>
            </div>

            <div className={`grid ${getGridColsClass()} gap-4`}>
              {cameras.map((camera) => (
                <div key={camera.id} className="relative group">
                  <WhepPlayer camera={camera} onDelete={handleDeleteCamera} />
                  
                  {/* Delete / Settings trigger */}
                  <button
                    onClick={() => handleDeleteCamera(camera.id)}
                    className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-red-600/80 text-gray-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 backdrop-blur-sm"
                    title="Delete Camera"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AddCameraModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCameraAdded={(newCam) => {
          setCameras((prev) => [newCam, ...prev]);
        }}
        onOpenPairEdge={() => setIsPairModalOpen(true)}
      />

      <PairEdgeModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        onPairSuccess={() => {
          fetchUserDataAndCameras();
        }}
      />

      <AppFooter />
    </div>
  );
}
