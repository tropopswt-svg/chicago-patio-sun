"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { X, MapPin, Building2, Play, Pause, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePatioPhoto } from "@/hooks/usePatioPhoto";
import { usePatioBusyness, getBusynessLevel } from "@/hooks/usePatioBusyness";
import { isPatioInShadow } from "@/lib/shadow-calc";
import { getSunPosition, isSunUp, getSunriseMinute, getSunsetMinute } from "@/lib/suncalc-utils";
import { isOpenAt } from "@/lib/hours";
import type { PatioWithSunStatus } from "@/lib/types";
import type { BuildingIndex } from "@/lib/building-index";

interface PatioDetailPanelProps {
  patio: PatioWithSunStatus | null;
  minuteOfDay: number;
  date: Date;
  buildingIndex: BuildingIndex | null;
  isPlaying?: boolean;
  onTimeChange: (minute: number) => void;
  onTogglePlay?: () => void;
  onClose: () => void;
}

function formatTime(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function dateFromMinute(base: Date, minute: number): Date {
  const d = new Date(base);
  d.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return d;
}

export function PatioDetailPanel({
  patio,
  minuteOfDay,
  date,
  buildingIndex,
  isPlaying,
  onTimeChange,
  onTogglePlay,
  onClose,
}: PatioDetailPanelProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [localMinute, setLocalMinute] = useState(minuteOfDay);
  const [isDragging, setIsDragging] = useState(false);

  // Panel drag-to-resize state — fully continuous, no snap points
  const [panelVh, setPanelVh] = useState(75);
  const panelDragStartY = useRef(0);
  const panelDragStartVh = useRef(75);
  const [isPanelDragging, setIsPanelDragging] = useState(false);

  // Reset to full height when a new patio opens
  useEffect(() => {
    if (patio) setPanelVh(75);
  }, [patio]);

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsPanelDragging(true);
    panelDragStartY.current = e.clientY;
    panelDragStartVh.current = panelVh;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [panelVh]);

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanelDragging) return;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const deltaVh = ((e.clientY - panelDragStartY.current) / vh) * 100;
    const newVh = Math.max(10, Math.min(80, panelDragStartVh.current - deltaVh));
    setPanelVh(newVh);
  }, [isPanelDragging]);

  const onHandlePointerUp = useCallback(() => {
    if (!isPanelDragging) return;
    // If dragged below 8vh, close the panel
    if (panelVh < 8) onClose();
    setIsPanelDragging(false);
  }, [isPanelDragging, panelVh, onClose]);

  const { user, isFavorite, toggleFavorite } = useAuth();
  const { photoUrl, hours, isOpen } = usePatioPhoto(patio, !!patio);
  const { forecast } = usePatioBusyness(patio, !!patio);

  // Sync local slider with parent when not dragging
  useEffect(() => {
    if (!isDragging) setLocalMinute(minuteOfDay);
  }, [minuteOfDay, isDragging]);

  // Close on Escape key
  useEffect(() => {
    if (!patio) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [patio, onClose]);

  const sunrise = useMemo(() => getSunriseMinute(date), [date]);
  const sunset = useMemo(() => getSunsetMinute(date), [date]);

  // Compute sun status for this patio at the local slider time
  const sunStatus = useMemo(() => {
    if (!patio || !buildingIndex) return null;
    const d = dateFromMinute(date, localMinute);
    if (!isSunUp(d)) return { inSun: false, label: "🌙 Night" };
    const { azimuthDegrees, altitudeDegrees } = getSunPosition(d);
    if (altitudeDegrees > 70) return { inSun: true, label: "☀️ Direct Sun" };
    const { inShadow } = isPatioInShadow(buildingIndex, patio.lng, patio.lat, azimuthDegrees, altitudeDegrees);
    return inShadow
      ? { inSun: false, label: "🏢 In Shade" }
      : { inSun: true, label: "☀️ In Sun" };
  }, [patio, buildingIndex, date, localMinute]);

  // Busyness at the local slider time
  const busyness = useMemo(
    () => getBusynessLevel(forecast, localMinute),
    [forecast, localMinute]
  );

  // Open status at slider time
  const openAtSlider = useMemo(() => {
    if (!patio) return null;
    return isOpenAt(patio.openingHours, dateFromMinute(date, localMinute));
  }, [patio, date, localMinute]);

  // Pre-compute hourly sun status for the timeline bar
  const hourlySun = useMemo(() => {
    if (!patio || !buildingIndex) return [];
    const result: boolean[] = [];
    for (let h = 0; h < 24; h++) {
      const m = h * 60;
      const d = dateFromMinute(date, m);
      if (!isSunUp(d)) { result.push(false); continue; }
      const { azimuthDegrees, altitudeDegrees } = getSunPosition(d);
      if (altitudeDegrees > 70) { result.push(true); continue; }
      const { inShadow } = isPatioInShadow(buildingIndex, patio.lng, patio.lat, azimuthDegrees, altitudeDegrees);
      result.push(!inShadow);
    }
    return result;
  }, [patio, buildingIndex, date]);

  // Slider drag handling
  const handleSliderInteraction = useCallback(
    (clientX: number) => {
      const el = sliderRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const minute = Math.round(pct * 1439);
      setLocalMinute(minute);
      onTimeChange(minute);
    },
    [onTimeChange]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handleSliderInteraction(e.clientX);
    },
    [handleSliderInteraction]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      handleSliderInteraction(e.clientX);
    },
    [isDragging, handleSliderInteraction]
  );

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (!patio) return null;

  const heroPhotoUrl = photoUrl
    ? photoUrl.replace(/maxWidthPx=\d+/, "maxWidthPx=480")
    : null;

  const today = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const sliderPct = (localMinute / 1439) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-2 sm:px-4 sm:py-4"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-full sm:max-w-md rounded-t-[24px] sm:rounded-[24px] overflow-hidden animate-slide-up sm:animate-none pointer-events-auto overflow-y-auto"
        style={{
          maxHeight: `${panelVh}vh`,
          transition: isPanelDragging ? 'none' : 'max-height 0.3s ease-out',
          background: "linear-gradient(160deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 50%, rgba(255, 255, 255, 0.04) 100%)",
          border: "0.5px solid rgba(255, 255, 255, 0.25)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        {/* Drag handle (mobile) — drag to resize */}
        <div
          className="sm:hidden flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
        >
          <div className="w-10 h-1.5 rounded-full bg-white/30" />
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 glass-icon-btn"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="relative p-4 space-y-3 pb-safe">
          {/* Name + address */}
          <div>
            <div className="flex items-center gap-2">
              <h2
                className="text-xl font-bold tracking-tight"
                style={{ color: "#fff", textShadow: "0 0 16px rgba(255,255,255,0.7), 0 0 40px rgba(255,184,0,0.5), 0 2px 4px rgba(0,0,0,0.8)" }}
              >{patio.name}</h2>
              {user && (
                <button
                  onClick={() => toggleFavorite(patio.id)}
                  className="shrink-0 transition-transform active:scale-90"
                  title={isFavorite(patio.id) ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isFavorite(patio.id) ? "fill-red-500 text-red-500" : "text-white/30 hover:text-white/60"
                    )}
                  />
                </button>
              )}
            </div>
            {patio.address && (
              <p
                className="text-xs flex items-center gap-1.5 mt-0.5"
                style={{ color: "rgba(255,255,255,0.9)", textShadow: "0 0 10px rgba(255,255,255,0.5), 0 1px 3px rgba(0,0,0,0.7)" }}
              >
                <MapPin className="w-3 h-3 shrink-0" />
                {patio.address}
              </p>
            )}
          </div>

          {/* Badge row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {patio.rooftop && (
              <span className="glass-badge glass-badge-rooftop text-xs px-2 py-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                Rooftop
              </span>
            )}
            {hours !== null && (
              <span className={cn("glass-badge text-xs px-2 py-0.5", isOpen ? "glass-badge-open" : "glass-badge-closed")}>
                {isOpen ? `Open · ${hours}` : `Closed · ${hours}`}
              </span>
            )}
          </div>

          {/* Date header */}
          <div
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "rgba(255,255,255,0.8)", textShadow: "0 0 8px rgba(255,255,255,0.4), 0 1px 3px rgba(0,0,0,0.6)" }}
          >
            {today}
          </div>

          {/* Interactive time slider */}
          <div className="space-y-2">
            {/* Time + play button row */}
            <div className="flex items-center gap-3">
              {onTogglePlay && (
                <button
                  onClick={onTogglePlay}
                  className={cn("glass-play-btn shrink-0", isPlaying && "playing")}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>
              )}
              <span
                className="text-xl font-semibold tabular-nums"
                style={{ color: "#fff", textShadow: "0 0 14px rgba(255,255,255,0.7), 0 0 30px rgba(255,184,0,0.4), 0 2px 4px rgba(0,0,0,0.8)" }}
              >
                {formatTime(localMinute)}
              </span>
              <div className="flex items-center gap-2 ml-auto">
                {sunStatus && (
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: sunStatus.inSun ? "#fbbf24" : "rgba(255,255,255,0.6)",
                      textShadow: sunStatus.inSun
                        ? "0 0 16px rgba(251,191,36,0.8), 0 0 32px rgba(255,184,0,0.5), 0 2px 4px rgba(0,0,0,0.7)"
                        : "0 0 12px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.7)",
                    }}
                  >
                    {sunStatus.label}
                  </span>
                )}
                {openAtSlider === true && (
                  <span className="text-sm font-semibold" style={{ color: "#4ade80", textShadow: "0 0 12px rgba(74,222,128,0.7), 0 0 24px rgba(74,222,128,0.3)" }}>Open</span>
                )}
                {openAtSlider === false && (
                  <span className="text-sm font-semibold" style={{ color: "#f87171", textShadow: "0 0 12px rgba(248,113,113,0.6), 0 0 24px rgba(248,113,113,0.3)" }}>Closed</span>
                )}
              </div>
            </div>

            {/* Sun timeline bar — shows sun/shade per hour */}
            <div
              ref={sliderRef}
              className="relative h-10 rounded-xl overflow-hidden cursor-pointer touch-none select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {/* Hourly sun/shade segments */}
              <div className="absolute inset-0 flex">
                {hourlySun.map((inSun, h) => {
                  const isDay = h * 60 >= sunrise && h * 60 <= sunset;
                  return (
                    <div
                      key={h}
                      className="flex-1 border-r border-white/[0.03]"
                      style={{
                        backgroundColor: !isDay
                          ? "rgba(30, 30, 60, 0.6)"
                          : inSun
                          ? "rgba(255, 184, 0, 0.25)"
                          : "rgba(100, 100, 120, 0.2)",
                      }}
                    />
                  );
                })}
              </div>

              {/* Busyness overlay (if available) */}
              {forecast && (
                <div className="absolute inset-0 flex items-end">
                  {forecast.map((val, h) => (
                    <div
                      key={h}
                      className="flex-1"
                      style={{
                        height: `${Math.max(val ?? 0, 2)}%`,
                        backgroundColor: (val ?? 0) > 70
                          ? "rgba(239, 68, 68, 0.3)"
                          : (val ?? 0) >= 40
                          ? "rgba(234, 179, 8, 0.2)"
                          : "rgba(34, 197, 94, 0.15)",
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Current time indicator */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.5)]"
                style={{ left: `${sliderPct}%` }}
              />
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg border-2 border-white/80"
                style={{ left: `calc(${sliderPct}% - 8px)` }}
              />
            </div>

            {/* Hour labels */}
            <div className="flex justify-between text-xs px-0.5 mt-1" style={{ color: "rgba(255,255,255,0.5)", textShadow: "0 0 4px rgba(255,255,255,0.15)" }}>
              <span>12a</span>
              <span>6a</span>
              <span>12p</span>
              <span>6p</span>
              <span>12a</span>
            </div>
          </div>

          {/* Busyness text */}
          {busyness && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>Busyness:</span>
              <span
                className="text-xs font-semibold"
                style={{
                  color: busyness.label === "Busy" ? "#f87171" : busyness.label === "Moderate" ? "#fbbf24" : "#4ade80",
                  textShadow: busyness.label === "Busy"
                    ? "0 0 10px rgba(248,113,113,0.6)"
                    : busyness.label === "Moderate"
                    ? "0 0 10px rgba(251,191,36,0.5)"
                    : "0 0 10px rgba(74,222,128,0.5)",
                }}
              >
                {busyness.label}
              </span>
            </div>
          )}

          {/* Small thumbnail in bottom-right corner */}
          {heroPhotoUrl && (
            <div className="flex justify-end">
              <img
                src={heroPhotoUrl}
                alt={patio.name}
                className="w-12 h-12 rounded-lg object-cover border border-white/20 shadow-lg"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
