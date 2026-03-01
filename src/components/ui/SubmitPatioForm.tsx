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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />

      {/* Modal */}
      <div className="glass-panel relative w-full max-w-md rounded-[24px] p-6">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 glass-icon-btn"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold text-white/90 mb-4 tracking-tight">Submit a Patio</h2>

        {status === "success" ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">&#10003;</div>
            <p className="text-green-300/80 font-medium">Patio submitted!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Venue Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="e.g. Kincade's Bar & Grill"
                className="glass-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1.5">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                placeholder="e.g. 950 W Armitage Ave"
                className="glass-input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1.5">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="glass-input text-sm [&>option]:bg-gray-900"
              >
                {VENUE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {status === "error" && (
              <p className="text-red-300/80 text-sm">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className={cn(
                "w-full py-2.5 rounded-full text-sm font-medium transition-all border",
                status === "submitting"
                  ? "bg-white/[0.06] border-white/[0.06] text-white/30 cursor-wait"
                  : "bg-white/[0.12] border-white/[0.15] text-white/85 hover:bg-white/[0.18] hover:border-white/[0.22]"
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
