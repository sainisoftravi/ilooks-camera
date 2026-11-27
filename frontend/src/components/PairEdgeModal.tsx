"use client";

import React, { useState, useEffect } from "react";
import { X, Server, CheckCircle2, RotateCw, Copy, Check } from "lucide-react";
import { api } from "@/lib/api";

interface PairEdgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPairSuccess: () => void;
}

export default function PairEdgeModal({
  isOpen,
  onClose,
  onPairSuccess,
}: PairEdgeModalProps) {
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isClaimed, setIsClaimed] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

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

  const dockerCommand = `docker run -d --restart=always --network=host \\
  -e PAIRING_CODE=${code} \\
  -e CLOUD_URL=https://ilook.labstackops.top \\
  ilook/edge-agent:latest`;

  const copyCommand = () => {
    navigator.clipboard.writeText(dockerCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Pair Local Edge Agent</h3>
              <p className="text-xs text-gray-400">Zero-port-forwarding ONVIF ingestion agent</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-center">
          {loading ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Generating secure pairing key...</p>
            </div>
          ) : isClaimed ? (
            <div className="py-6 flex flex-col items-center gap-3 text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
              <h4 className="text-lg font-bold text-white">Edge Agent Paired!</h4>
              <p className="text-xs text-gray-400">
                Your edge agent is connected. Automatically scanning your local cameras...
              </p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs text-gray-400 mb-2">
                  Enter this 6-digit code on your local edge agent CLI or run the Docker command below:
                </p>
                <div className="flex items-center justify-center gap-2 font-mono text-3xl font-black tracking-widest text-indigo-400 bg-gray-950 py-4 px-6 rounded-xl border border-gray-800 shadow-inner">
                  {code ? code : "------"}
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] text-gray-500">
                  <RotateCw className="w-3 h-3 animate-spin text-indigo-400" />
                  <span>Waiting for edge agent to claim...</span>
                </div>
              </div>

              <div className="text-left space-y-1.5">
                <label className="text-xs font-medium text-gray-300">
                  One-Line Docker Run Command (Local Host / Raspberry Pi):
                </label>
                <div className="relative">
                  <pre className="p-3 bg-gray-950 border border-gray-800 rounded-lg font-mono text-[11px] text-gray-300 overflow-x-auto">
                    {dockerCommand}
                  </pre>
                  <button
                    onClick={copyCommand}
                    className="absolute right-2 top-2 p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md border border-gray-700"
                    title="Copy Docker command"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
