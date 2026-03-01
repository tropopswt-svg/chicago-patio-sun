"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { X, MapPin, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
  onTimeChange: (minute: number) => void;
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
  onTimeChange,
  onClose,
}: PatioDetailPanelProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [localMinute, setLocalMinute] = useState(minuteOfDay);
  const [isDragging, setIsDragging] = useState(false);

  // Panel drag-to-resize state
  const [snapPoint, setSnapPoint] = useState<'full' | 'mid' | 'min'>('full');
  const panelDragStartY = useRef(0);
  const [panelDragDelta, setPanelDragDelta] = useState(0);
  const [isPanelDragging, setIsPanelDragging] = useState(false);

  const SNAP_VH = { full: 75, mid: 40, min: 18 };
  const currentSnapVh = SNAP_VH[snapPoint];
  const effectiveVh = isPanelDragging
    ? Math.max(15, Math.min(80, currentSnapVh - (panelDragDelta / (typeof window !== 'undefined' ? window.innerHeight : 800)) * 100))
    : currentSnapVh;

  // Reset to full height when a new patio opens
  useEffect(() => {
    if (patio) setSnapPoint('full');
  }, [patio]);

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsPanelDragging(true);
    panelDragStartY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanelDragging) return;
    setPanelDragDelta(e.clientY - panelDragStartY.current);
  }, [isPanelDragging]);

  const onHandlePointerUp = useCallback(() => {
    if (!isPanelDragging) return;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const h = Math.max(15, Math.min(80, currentSnapVh - (panelDragDelta / vh) * 100));
    if (h > 55) setSnapPoint('full');
    else if (h > 27) setSnapPoint('mid');
    else setSnapPoint('min');
    setPanelDragDelta(0);
    setIsPanelDragging(false);
  }, [isPanelDragging, currentSnapVh, panelDragDelta]);

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
      className={cn(
        "fixed inset-0 z-50 flex items-end sm:items-center justify-center px-2 sm:px-4 sm:py-4",
        snapPoint !== 'full' && "pointer-events-none"
      )}
    >
      {snapPoint === 'full' && (
        <div className="absolute inset-0 bg-black/15" onClick={onClose} />
      )}

      <div
        className={cn(
          "relative w-full sm:max-w-md rounded-t-[24px] sm:rounded-[24px] overflow-hidden max-h-[75vh] sm:max-h-[90vh] animate-slide-up sm:animate-none pointer-events-auto",
          snapPoint === 'full' ? "overflow-y-auto" : "overflow-hidden"
        )}
        style={{
          ...(snapPoint !== 'full' || isPanelDragging
            ? { maxHeight: `${effectiveVh}vh`, transition: isPanelDragging ? 'none' : 'max-height 0.3s ease-out' }
            : {}),
          background: "linear-gradient(160deg, rgba(20, 20, 45, 0.94) 0%, rgba(15, 15, 35, 0.97) 50%, rgba(25, 25, 50, 0.92) 100%)",
          border: "0.5px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
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

        {/* Hero photo */}
        {heroPhotoUrl ? (
          <img src={heroPhotoUrl} alt={patio.name} className="w-full h-[120px] object-cover" />
        ) : (
          <div className={cn(
            "w-full h-[120px] flex items-center justify-center",
            sunStatus?.inSun
              ? "bg-gradient-to-br from-amber-900/30 to-orange-900/10"
              : "bg-gradient-to-br from-gray-800/30 to-slate-900/10"
          )}>
            <span className="text-4xl">{sunStatus?.inSun ? "☀️" : "🌙"}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-3 pb-safe">
          {/* Name + address */}
          <div>
            <h2 className="text-lg font-semibold text-white/95 tracking-tight">{patio.name}</h2>
            {patio.address && (
              <p className="text-xs text-white/45 flex items-center gap-1.5 mt-0.5">
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
          <div className="text-xs text-white/40 font-medium uppercase tracking-wider">
            {today}
          </div>

          {/* Interactive time slider */}
          <div className="space-y-1.5">
            {/* Time + sun status display */}
            <div className="flex items-center justify-between">
              <span className="text-xl font-semibold text-white/90 tabular-nums">
                {formatTime(localMinute)}
              </span>
              <div className="flex items-center gap-2">
                {sunStatus && (
                  <span className={cn(
                    "text-sm font-medium",
                    sunStatus.inSun ? "text-amber-300" : "text-white/50"
                  )}>
                    {sunStatus.label}
                  </span>
                )}
                {openAtSlider === true && (
                  <span className="text-xs text-green-400 font-medium">Open</span>
                )}
                {openAtSlider === false && (
                  <span className="text-xs text-red-400/70 font-medium">Closed</span>
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
            <div className="flex justify-between text-xs text-white/30 px-0.5">
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
              <span className="text-xs text-white/40">Busyness:</span>
              <span className={cn(
                "text-xs font-medium",
                busyness.label === "Busy" ? "text-red-300/80"
                  : busyness.label === "Moderate" ? "text-yellow-300/80"
                  : "text-green-300/80"
              )}>
                {busyness.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
