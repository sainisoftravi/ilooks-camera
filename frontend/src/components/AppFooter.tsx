"use client";

import React, { useState } from "react";
import { Sparkles, X, CheckCircle2, Shield, Radio } from "lucide-react";
import versionData from "@/config/version.json";

export default function AppFooter() {
  const [showChangelog, setShowChangelog] = useState(false);

  return (
    <>
      <footer className="border-t border-gray-800/80 bg-gray-950/80 backdrop-blur-sm py-4 px-6 text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-3 mt-auto">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-400">iLook</span>
          <span className="text-gray-600">•</span>
          <span>Commercial Video Cloud</span>
          <span className="text-gray-600">•</span>
          <span className="font-mono text-[11px] text-gray-400">v{versionData.version}</span>
          <span className="text-[10px] text-gray-600 font-mono">({versionData.build})</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowChangelog(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/50 text-blue-400 text-[11px] font-medium transition-colors"
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>What's New in v{versionData.version}</span>
          </button>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-900/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>K3s ARM64</span>
          </div>
        </div>
      </footer>

      {/* Release Notes / What's New Modal */}
      {showChangelog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-gray-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">
                    Release Notes • v{versionData.version}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Build {versionData.build} — Released {versionData.releaseDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChangelog(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feature List */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
              {versionData.features.map((release, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white tracking-wide">
                      {release.title}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 bg-gray-800/80 px-2 py-0.5 rounded">
                      {release.date}
                    </span>
                  </div>

                  <ul className="space-y-2">
                    {release.highlights.map((highlight, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-2.5 text-xs text-gray-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-950/80 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setShowChangelog(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shadow"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
