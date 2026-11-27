"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Server,
  Activity,
  Layers,
  CheckCircle2,
  Cpu,
  Radio,
  ExternalLink
} from "lucide-react";
import { api } from "@/lib/api";
import AppFooter from "@/components/AppFooter";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        const res = await api.login({ email, password });
        localStorage.setItem("ilook_token", res.access_token);
        localStorage.setItem("ilook_user", JSON.stringify(res.user));
        router.push("/dashboard");
      } else {
        const res = await api.signup({ email, password, full_name: fullName });
        localStorage.setItem("ilook_token", res.access_token);
        localStorage.setItem("ilook_user", JSON.stringify(res.user));
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail("admin@ilook.com");
    setPassword("admin123");
  };

  return (
    <div className="min-h-screen bg-[#070A11] text-gray-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden font-sans">
      {/* High-tech Surveillance Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#3B82F6 1px, transparent 1px), linear-gradient(to right, #3B82F6 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      {/* Subtle Glow Spheres */}
      <div className="absolute top-1/4 left-10 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Enterprise Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 z-10">
        <div className="w-full max-w-5xl bg-[#0D121F]/90 border border-gray-800/80 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* LEFT SIDE: Brand Showcase & Telemetry (Hik-Connect / Dahua DSS Pro Style) */}
          <div className="lg:col-span-6 bg-gradient-to-br from-[#0B0F1C] to-[#111827] p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gray-800/80 relative">
            <div>
              {/* Top Enterprise Badges */}
              <div className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 border border-blue-400/20">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-lg tracking-tight text-white flex items-center gap-2">
                    iLook <span className="text-blue-500 font-semibold text-sm">Cloud Connect</span>
                  </h2>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Enterprise VMS &middot; v1.0.0</span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3 mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                  Commercial IP Camera & Cloud Video Wall
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  Next-generation cloud surveillance management. Connect local Hikvision, Dahua, CP Plus, and generic RTSP cameras without risky router port forwarding.
                </p>
              </div>

              {/* Enterprise Feature Pills */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold">
                    <Activity className="w-3.5 h-3.5" />
                    <span>&lt;200ms Latency</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Pure WebRTC WHEP real-time playback</p>
                </div>

                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Zero-Port Security</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Encrypted outbound-only TLS tunnel</p>
                </div>

                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Multi-Camera Grid</span>
                  </div>
                  <p className="text-[11px] text-gray-400">1x1, 2x2, 3x3, 4x4 interactive video wall</p>
                </div>

                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Edge Local & Cloud</span>
                  </div>
                  <p className="text-[11px] text-gray-400">View in local LAN & global web portal</p>
                </div>
              </div>
            </div>

            {/* Server Telemetry Badge */}
            <div className="pt-4 border-t border-gray-800/60 flex items-center justify-between text-[11px] font-mono text-gray-500">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Gateway: <b className="text-gray-300">stream.labstackops.top</b></span>
              </span>
              <span className="text-emerald-400 font-semibold">ONLINE (100%)</span>
            </div>
          </div>

          {/* RIGHT SIDE: Authentication Form (Hik-Connect Card Style) */}
          <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center bg-[#0D121F]">
            <div className="max-w-sm w-full mx-auto space-y-6">
              
              {/* Tab Selector */}
              <div className="grid grid-cols-2 bg-gray-950 p-1 rounded-xl border border-gray-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setError(""); }}
                  className={`py-2 rounded-lg transition-all ${
                    isLogin ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Operator Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setError(""); }}
                  className={`py-2 rounded-lg transition-all ${
                    !isLogin ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold" : "text-gray-400 hover:text-white"
                  }`}
                >
                  New Organization
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3.5 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2.5 animate-shake">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                {!isLogin && (
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Full Name / Company Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="John Doe (Security Admin)"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="admin@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-gray-300">
                      Security Password
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={fillDemoAccount}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition"
                      >
                        Auto-fill Demo
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isLogin && (
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Keep me signed in</span>
                    </label>
                    <span className="text-gray-500">Encrypted TLS 1.3</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isLogin ? "Access VMS Console" : "Create Enterprise Account"}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Security certification tags */}
              <div className="pt-4 border-t border-gray-800/60 text-center">
                <span className="text-[11px] text-gray-500">
                  Protected by iLook Multi-Tenant Security & WHEP Media Stream Encryption
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
