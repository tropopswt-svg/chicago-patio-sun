"use client";

import { useRef, useEffect, useState } from "react";
import { X, MapPin, Sun, Cloud, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatioPhoto } from "@/hooks/usePatioPhoto";
import { usePatioBusyness, getBusynessLevel } from "@/hooks/usePatioBusyness";
import type { PatioWithSunStatus } from "@/lib/types";

interface PatioDetailPanelProps {
  patio: PatioWithSunStatus | null;
  minuteOfDay: number;
  onClose: () => void;
}

export function PatioDetailPanel({ patio, minuteOfDay, onClose }: PatioDetailPanelProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [barWidth, setBarWidth] = useState(0);

  const { photoUrl, hours, isOpen } = usePatioPhoto(patio, !!patio);
  const { forecast } = usePatioBusyness(patio, !!patio);
  const busyness = getBusynessLevel(forecast, minuteOfDay);

  // Measure the gradient bar width for dot positioning
  useEffect(() => {
    if (!barRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setBarWidth(entry.contentRect.width);
    });
    observer.observe(barRef.current);
    return () => observer.disconnect();
  }, [patio]);

  // Close on Escape key
  useEffect(() => {
    if (!patio) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [patio, onClose]);

  if (!patio) return null;

  // Upgrade photo URL from 96px thumbnail to 480px
  const heroPhotoUrl = photoUrl
    ? photoUrl.replace(/maxWidthPx=\d+/, "maxWidthPx=480")
    : null;

  const dotPosition = busyness ? (busyness.value / 100) * barWidth : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="glass-panel relative w-full max-w-md rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero photo */}
        {heroPhotoUrl ? (
          <img
            src={heroPhotoUrl}
            alt={patio.name}
            className="w-full h-[200px] object-cover"
          />
        ) : (
          <div
            className={cn(
              "w-full h-[200px] flex items-center justify-center",
              patio.inSun
                ? "bg-gradient-to-br from-amber-900/40 to-orange-900/20"
                : "bg-gradient-to-br from-gray-800/40 to-slate-900/20"
            )}
          >
            {patio.inSun ? (
              <Sun className="w-16 h-16 text-amber-500/30" />
            ) : (
              <Cloud className="w-16 h-16 text-gray-500/30" />
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Name + address */}
          <div>
            <h2 className="text-xl font-semibold text-white">{patio.name}</h2>
            {patio.address && (
              <p className="text-sm text-white/50 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {patio.address}
              </p>
            )}
          </div>

          {/* Badge row */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full",
                patio.inSun
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-gray-500/20 text-gray-400"
              )}
            >
              {patio.inSun ? "☀️ In Sun" : "🌥️ In Shade"}
            </span>
            {patio.rooftop && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300">
                <Building2 className="w-3 h-3" />
                Rooftop
              </span>
            )}
            {hours !== null && (
              <span
                className={cn(
                  "inline-flex items-center text-xs px-2.5 py-1 rounded-full",
                  isOpen
                    ? "bg-green-500/20 text-green-300"
                    : "bg-gray-500/20 text-gray-400"
                )}
              >
                {isOpen ? `Open · ${hours}` : `Closed · ${hours}`}
              </span>
            )}
          </div>

          {/* Sun tag */}
          {patio.sunTag && (
            <p className="text-sm text-white/50">{patio.sunTag}</p>
          )}

          {/* Busyness sliding indicator */}
          {busyness && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white/70">Busyness now</h3>

              {/* Gradient bar with dot */}
              <div className="relative">
                <div
                  ref={barRef}
                  className="busyness-gradient-bar h-3 rounded-full"
                />
                {barWidth > 0 && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-white/80 shadow-lg transition-all duration-300"
                    style={{ left: `calc(${dotPosition}px - 8px)` }}
                  />
                )}
              </div>

              {/* Labels */}
              <div className="flex justify-between text-[11px] text-white/40">
                <span>Quiet</span>
                <span>Moderate</span>
                <span>Busy</span>
              </div>

              {/* Current level text */}
              <p
                className={cn(
                  "text-sm font-medium",
                  busyness.label === "Busy"
                    ? "text-red-300"
                    : busyness.label === "Moderate"
                    ? "text-yellow-300"
                    : "text-green-300"
                )}
              >
                {busyness.label} · {busyness.value}
              </p>
            </div>
          )}

          {/* Sun status section */}
          <div
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl",
              patio.inSun
                ? "bg-amber-500/10"
                : "bg-gray-500/10"
            )}
          >
            {patio.inSun ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Cloud className="w-5 h-5 text-gray-400" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                patio.inSun ? "text-amber-300" : "text-gray-400"
              )}
            >
              {patio.inSun ? "In Sun" : "In Shade"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
