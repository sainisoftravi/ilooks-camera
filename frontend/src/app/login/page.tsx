"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Share2,
  Shield,
  Cloud,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail("admin@ilook.com");
    setPassword("admin123");
  };

  return (
    <div className="min-h-screen bg-[#070A0F] text-gray-100 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans select-none">
      {/* Background Decorative Rings & Nebula Glow */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle Watermark Orbital Eye in Center Background */}
        <div
          className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-no-repeat bg-center bg-contain opacity-10 blur-sm pointer-events-none"
          style={{ backgroundImage: `url('/logo-icon.png')` }}
        />
        {/* Emerald Ambient Light */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
      </div>

      {/* Main Two-Column Container Matching Exact Image Design */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10 py-6">
        
        {/* LEFT COLUMN: Logo, Branding & Glow Pills */}
        <div className="lg:col-span-6 flex flex-col justify-center space-y-8 pl-0 lg:pl-6">
          
          {/* Official Brand Logo */}
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <img
                src="/logo-icon.png"
                alt="iLooks-Connect"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.35)] object-contain border border-emerald-500/30"
              />
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center">
                  iLooks<span className="text-[#10B981]">-Connect</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 font-semibold tracking-[0.2em] uppercase mt-0.5">
                  ANYWHERE. ANYTIME.
                </p>
              </div>
            </div>
          </div>

          {/* Three Feature Glow Pills (Exact Match to Design) */}
          <div className="space-y-4 pt-2">
            {/* Pill 1: Zero Port Forwarding */}
            <div className="flex items-center gap-3 px-6 py-3.5 rounded-full bg-[#0D131C]/90 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-white text-sm font-medium w-fit hover:border-emerald-400 transition-all cursor-default group">
              <div className="w-6 h-6 rounded-full bg-emerald-950/80 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Share2 className="w-3.5 h-3.5" />
              </div>
              <span className="tracking-wide">Zero Port Forwarding</span>
            </div>

            {/* Pill 2: Encrypted WebRTC */}
            <div className="flex items-center gap-3 px-6 py-3.5 rounded-full bg-[#0D131C]/90 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-white text-sm font-medium w-fit hover:border-emerald-400 transition-all cursor-default group">
              <div className="w-6 h-6 rounded-full bg-emerald-950/80 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <span className="tracking-wide">Encrypted WebRTC</span>
            </div>

            {/* Pill 3: Multi-Site Cloud */}
            <div className="flex items-center gap-3 px-6 py-3.5 rounded-full bg-[#0D131C]/90 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-white text-sm font-medium w-fit hover:border-emerald-400 transition-all cursor-default group">
              <div className="w-6 h-6 rounded-full bg-emerald-950/80 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Cloud className="w-3.5 h-3.5" />
              </div>
              <span className="tracking-wide">Multi-Site Cloud</span>
            </div>
          </div>

          {/* Quick Demo Credentials Autofill Link */}
          <div className="pt-2">
            <button
              type="button"
              onClick={fillDemoAccount}
              className="text-xs text-amber-400/90 hover:text-amber-300 flex items-center gap-1.5 transition underline font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Click to auto-fill Administrator Demo Account</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: The Translucent Glassmorphism Card */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div className="w-full max-w-md bg-[#111722]/85 border border-emerald-500/25 rounded-3xl p-8 sm:p-10 shadow-[0_15px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(16,185,129,0.12)] backdrop-blur-2xl relative">
            
            {/* Star Sparkle in Bottom Right (Exact to Image) */}
            <div className="absolute -bottom-3 -right-3 text-amber-400/80 pointer-events-none select-none text-2xl animate-pulse">
              ✦
            </div>

            {/* Top Navigation Tabs */}
            <div className="flex items-center justify-center gap-8 border-b border-gray-800/80 pb-4 mb-8">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(""); }}
                className={`text-sm font-bold transition-all relative pb-2 ${
                  isLogin ? "text-[#10B981]" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Sign In
                {isLogin && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10B981] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(""); }}
                className={`text-sm font-bold transition-all relative pb-2 ${
                  !isLogin ? "text-[#10B981]" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Create Account
                {!isLogin && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10B981] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!isLogin && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Your Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#151D2A] border border-gray-700/80 focus:border-amber-500/80 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-[#151D2A] border border-amber-500/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-11 py-3 bg-[#151D2A] border border-gray-700/80 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-400/40 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-200 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {isLogin && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => alert("To reset password, contact your system administrator or cloud support.")}
                      className="text-xs text-[#10B981] hover:text-emerald-300 transition font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              {/* Big Emerald CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-gray-950 font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{isLogin ? "Sign In to iLooks-Connect" : "Register with iLooks-Connect"}</span>
                )}
              </button>
            </form>

            {/* Bottom Links (Need help? & Don't have an account?) */}
            <div className="pt-6 text-center space-y-2">
              <div>
                <a
                  href="mailto:support@labstackops.top"
                  className="text-xs text-amber-400/90 hover:text-amber-300 font-medium transition"
                >
                  Need help?
                </a>
              </div>
              <div className="text-xs text-gray-400">
                {isLogin ? (
                  <span>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => { setIsLogin(false); setError(""); }}
                      className="text-[#10B981] hover:underline font-semibold"
                    >
                      Sign up
                    </button>
                  </span>
                ) : (
                  <span>
                    Already registered?{" "}
                    <button
                      type="button"
                      onClick={() => { setIsLogin(true); setError(""); }}
                      className="text-[#10B981] hover:underline font-semibold"
                    >
                      Sign in
                    </button>
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Subtle Footer Bar */}
      <footer className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-gray-600 font-mono">
        iLooks-Connect &bull; ANYWHERE. ANYTIME. &bull; Enterprise Video Management Platform
      </footer>
    </div>
  );
}
