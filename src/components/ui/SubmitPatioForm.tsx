"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmitPatioFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const VENUE_TYPES = [
  { value: "bar", label: "Bar" },
  { value: "restaurant", label: "Restaurant" },
  { value: "pub", label: "Pub" },
  { value: "rooftop", label: "Rooftop" },
] as const;

export function SubmitPatioForm({ isOpen, onClose, onSuccess }: SubmitPatioFormProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<string>("bar");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/patios/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, type }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Submission failed");
        return;
      }

      setStatus("success");
      setName("");
      setAddress("");
      setType("bar");

      // Trigger refresh and close after brief delay
      onSuccess();
      setTimeout(() => {
        setStatus("idle");
        onClose();
      }, 1500);
    } catch {
      setStatus("error");
      setErrorMsg("Network error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="glass-panel relative w-full max-w-md rounded-2xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold text-white mb-4">Submit a Patio</h2>

        {status === "success" ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">&#10003;</div>
            <p className="text-green-400 font-medium">Patio submitted!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Venue Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="e.g. Kincade's Bar & Grill"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                placeholder="e.g. 950 W Armitage Ave"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 [&>option]:bg-gray-900"
              >
                {VENUE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {status === "error" && (
              <p className="text-red-400 text-sm">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className={cn(
                "w-full py-2.5 rounded-xl text-sm font-medium transition-colors",
                status === "submitting"
                  ? "bg-amber-500/20 text-amber-300/50 cursor-wait"
                  : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
              )}
            >
              {status === "submitting" ? "Submitting..." : "Submit Patio"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
