"use client";

import React, { useState } from "react";
import { X, Video, ShieldCheck, Copy, Check, Server } from "lucide-react";
import { api, Camera } from "@/lib/api";

interface AddCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCameraAdded: (cam: Camera) => void;
  onOpenPairEdge: () => void;
}

export default function AddCameraModal({
  isOpen,
  onClose,
  onCameraAdded,
  onOpenPairEdge,
}: AddCameraModalProps) {
  const [tab, setTab] = useState<"direct" | "edge">("direct");
  const [name, setName] = useState("");
  const [rtspUrl, setRtspUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdCam, setCreatedCam] = useState<Camera | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    try {
      const cam = await api.createDirectCamera({
        name: name.trim(),
        rtsp_source_url: rtspUrl.trim() || undefined,
      });
      setCreatedCam(cam);
      onCameraAdded(cam);
    } catch (err: any) {
      setError(err.message || "Failed to register camera");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Add New Camera</h3>
              <p className="text-xs text-gray-400">Connect IP cameras to iLook Cloud</p>
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
        <div className="grid grid-cols-2 border-b border-gray-800 bg-gray-950/50">
          <button
            onClick={() => { setTab("direct"); setCreatedCam(null); }}
            className={`py-3 text-xs font-medium border-b-2 transition-colors ${
              tab === "direct"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            Direct RTSP / UID Claim
          </button>
          <button
            onClick={() => { setTab("edge"); setCreatedCam(null); }}
            className={`py-3 text-xs font-medium border-b-2 transition-colors ${
              tab === "edge"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            Edge Node / ONVIF LAN Scan
          </button>
        </div>

        <div className="p-6">
          {tab === "direct" && !createdCam && (
            <form onSubmit={handleDirectSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Camera Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Front Gate, Office Desk"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Local RTSP Feed URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="rtsp://admin:pass@192.168.1.100:554/stream1"
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  iLook will generate unique RTSP push credentials for this camera.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-blue-600/20"
                >
                  {loading ? "Registering Camera..." : "Generate Ingestion Credentials"}
                </button>
              </div>
            </form>
          )}

          {tab === "direct" && createdCam && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Camera <b>{createdCam.name}</b> registered successfully!</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Assigned Camera UID
                </label>
                <div className="p-2.5 bg-gray-950 border border-gray-800 rounded-lg font-mono text-xs text-blue-400">
                  {createdCam.cam_uid}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  RTSP Outbound Ingestion Push URL
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={createdCam.rtsp_push_url}
                    className="w-full pr-10 pl-3 py-2 bg-gray-950 border border-gray-800 rounded-lg font-mono text-xs text-gray-200 select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(createdCam.rtsp_push_url)}
                    className="absolute right-2 top-2 p-1 text-gray-400 hover:text-white"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Use FFmpeg, go2rtc, or OBS to push this camera stream to iLook cloud.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors mt-2"
              >
                Close & View on Dashboard
              </button>
            </div>
          )}

          {tab === "edge" && (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30">
                <Server className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-white text-base">Automatic ONVIF Local Discovery</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                Run the <b>iLook Edge Agent</b> on your Raspberry Pi or local Docker machine. It will automatically scan your local network for ONVIF cameras and push them securely to your account.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenPairEdge();
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
                >
                  Pair Edge Agent (6-Digit Code)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
