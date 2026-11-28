"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { 
  Maximize2, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Wifi, 
  WifiOff, 
  ShieldAlert,
  Activity
} from "lucide-react";
import { api, Camera } from "@/lib/api";

interface WhepPlayerProps {
  camera: Camera;
  onDelete?: (id: string) => void;
}

export default function WhepPlayer({ camera, onDelete }: WhepPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<"connecting" | "live" | "offline" | "error">("connecting");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [protocolMode, setProtocolMode] = useState<"webrtc" | "hls">("webrtc");
  const hlsRef = useRef<any>(null);

  const cleanupConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = "";
    }
  }, []);

  const startHlsSession = useCallback(() => {
    cleanupConnection();
    setStatus("connecting");
    setErrorMessage("");
    setProtocolMode("hls");
    const hlsUrl = `/api/v1/hls/${camera.cam_uid}/index.m3u8`;

    if (typeof window !== "undefined" && (window as any).Hls && (window as any).Hls.isSupported()) {
      const Hls = (window as any).Hls;
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      if (videoRef.current) {
        hls.attachMedia(videoRef.current);
      }
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus("live");
      });
      hls.on(Hls.Events.ERROR, (_: any, data: any) => {
        if (data.fatal) {
          setStatus("offline");
          setErrorMessage("HLS feed buffering or offline");
        }
      });
    } else if (videoRef.current && videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = hlsUrl;
      videoRef.current.onloadedmetadata = () => setStatus("live");
      videoRef.current.onerror = () => setStatus("offline");
    }
  }, [camera.cam_uid, cleanupConnection]);

  const startWhepSession = useCallback(async () => {
    if (protocolMode === "hls") {
      startHlsSession();
      return;
    }

    cleanupConnection();
    setStatus("connecting");
    setErrorMessage("");

    try {
      // 1. Fetch authorized playback token & WHEP URL from backend
      const auth = await api.getPlaybackAuth(camera.id);
      const whepUrl = auth.whep_url;

      // 2. Initialize RTCPeerConnection with Google STUN servers
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" }
        ],
        bundlePolicy: "max-bundle",
      });
      pcRef.current = pc;

      // Set up receiving transceivers
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setStatus("live");
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === "connected" || state === "completed") {
          setStatus("live");
        } else if (state === "disconnected" || state === "failed") {
          setStatus("offline");
          // Schedule auto-reconnect
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
          }, 4000);
        }
      };

      // 3. Create SDP Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete or send initial offer
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve();
        } else {
          const checkState = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", checkState);
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", checkState);
          // Timeout after 800ms to avoid freezing
          setTimeout(resolve, 800);
        }
      });

      // 4. POST SDP Offer to MediaMTX WHEP endpoint
      const response = await fetch(whepUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
        },
        body: pc.localDescription?.sdp || offer.sdp,
      });

      if (!response.ok) {
        if (response.status === 404) {
          setStatus("offline");
          setErrorMessage("Camera feed not publishing yet");
        } else if (response.status === 401 || response.status === 403) {
          setStatus("error");
          setErrorMessage("Unauthorized playback token");
        } else {
          setStatus("error");
          setErrorMessage(`Media gateway HTTP ${response.status}`);
        }
        return;
      }

      // 5. Receive SDP Answer & Apply
      const answerSdp = await response.text();
      await pc.setRemoteDescription(
        new RTCSessionDescription({
          type: "answer",
          sdp: answerSdp,
        })
      );

      setStatus("live");
    } catch (err: any) {
      console.error(`WHEP session error for ${camera.name}:`, err);
      setStatus("offline");
      setErrorMessage(err.message || "Connection failed");
      // Auto-retry
      setTimeout(() => {
        setRetryCount((c) => c + 1);
      }, 5000);
    }
  }, [camera.id, camera.name, cleanupConnection]);

  // Periodic latency and WebRTC stats checker
  useEffect(() => {
    if (status !== "live") return;
    const interval = setInterval(async () => {
      if (!pcRef.current) return;
      try {
        const stats = await pcRef.current.getStats();
        stats.forEach((report) => {
          if (report.type === "candidate-pair" && report.state === "succeeded") {
            if (report.currentRoundTripTime) {
              setLatencyMs(Math.round(report.currentRoundTripTime * 1000));
            }
          }
        });
      } catch (e) {
        // ignore
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [status]);

  // Trigger stream connect & re-trigger on retryCount change
  useEffect(() => {
    startWhepSession();
    return () => {
      cleanupConnection();
    };
  }, [startWhepSession, cleanupConnection, retryCount]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative group rounded-xl overflow-hidden bg-gray-950 border border-gray-800 shadow-xl aspect-video flex items-center justify-center select-none"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className="w-full h-full object-cover"
      />

      {/* Top Overlay Badge Header */}
      <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-wide text-white drop-shadow">
            {camera.name}
          </span>
          <span className="text-[10px] font-mono text-gray-400 bg-black/50 px-1.5 py-0.5 rounded border border-gray-700">
            {camera.cam_uid}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Protocol Switcher Pill (WebRTC / HLS) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (protocolMode === "webrtc") {
                startHlsSession();
              } else {
                setProtocolMode("webrtc");
                startWhepSession();
              }
            }}
            className="pointer-events-auto px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors flex items-center gap-1 bg-gray-900/90 hover:bg-gray-800 border-gray-700 text-gray-300 hover:text-white"
            title="Switch between WebRTC (Ultra Low Latency) and HLS (High Stability)"
          >
            {protocolMode === "webrtc" ? "⚡ WebRTC" : "📺 HLS"}
          </button>

          {status === "live" && (
            <>
              {latencyMs !== null && (
                <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800">
                  <Activity className="w-3 h-3 animate-pulse" />
                  <span>{latencyMs} ms</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE</span>
              </div>
            </>
          )}

          {status === "connecting" && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-800">
              <RotateCw className="w-3 h-3 animate-spin" />
              <span>CONNECTING</span>
            </div>
          )}

          {status === "offline" && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 bg-gray-900/80 px-2 py-0.5 rounded-full border border-gray-700">
              <WifiOff className="w-3 h-3" />
              <span>OFFLINE</span>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-800">
              <ShieldAlert className="w-3 h-3" />
              <span>DENIED</span>
            </div>
          )}
        </div>
      </div>

      {/* Offline / Connecting Placeholder Screen */}
      {status !== "live" && (
        <div className="absolute inset-0 bg-gray-950/85 flex flex-col items-center justify-center p-4 text-center z-10">
          {status === "connecting" && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-gray-300">Negotiating WebRTC WHEP Session...</p>
            </div>
          )}
          {status === "offline" && (
            <div className="flex flex-col items-center gap-2">
              <WifiOff className="w-10 h-10 text-gray-600 mb-1" />
              <p className="text-sm font-semibold text-gray-300">Camera is Offline</p>
              <p className="text-xs text-gray-500 max-w-xs">
                {errorMessage || "Waiting for local edge agent or camera to push RTSP stream to MediaMTX."}
              </p>
              <button
                onClick={() => setRetryCount((c) => c + 1)}
                className="mt-3 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 rounded-lg border border-gray-700 flex items-center gap-1.5 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" /> Reconnect Now
              </button>
            </div>
          )}
          {status === "error" && (
            <div className="flex flex-col items-center gap-2">
              <ShieldAlert className="w-10 h-10 text-rose-500 mb-1" />
              <p className="text-sm font-semibold text-rose-400">Access Restricted</p>
              <p className="text-xs text-gray-500">{errorMessage}</p>
            </div>
          )}
        </div>
      )}

      {/* Bottom Floating Control Bar (Shows on Hover) */}
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 bg-black/60 hover:bg-black/90 text-gray-300 hover:text-white rounded-lg border border-gray-700 backdrop-blur-sm transition-colors"
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
          </button>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="p-1.5 bg-black/60 hover:bg-black/90 text-gray-300 hover:text-white rounded-lg border border-gray-700 backdrop-blur-sm transition-colors"
            title="Refresh Stream"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-black/60 hover:bg-black/90 text-gray-300 hover:text-white rounded-lg border border-gray-700 backdrop-blur-sm transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
