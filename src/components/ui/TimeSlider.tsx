"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Moon } from "lucide-react";
import { formatMinuteOfDay } from "@/lib/suncalc-utils";
import { cn } from "@/lib/utils";
import type { TimeState } from "@/lib/types";

interface TimeSliderProps {
  timeState: TimeState;
  sunriseMinute: number;
  sunsetMinute: number;
  onMinuteChange: (minute: number) => void;
  onTogglePlay: () => void;
}

export function TimeSlider({
  timeState,
  sunriseMinute,
  sunsetMinute,
  onMinuteChange,
  onTogglePlay,
}: TimeSliderProps) {
  const { minuteOfDay, isPlaying, isNight } = timeState;
  const [localMinute, setLocalMinute] = useState(minuteOfDay);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingMinuteRef = useRef<number | null>(null);

  // Sync local state from parent when not dragging
  useEffect(() => {
    if (!isDragging) setLocalMinute(minuteOfDay);
  }, [minuteOfDay, isDragging]);

  // rAF-throttled fire: at most one onMinuteChange per frame for zero-lag updates
  const fireChange = useCallback(
    (minute: number) => {
      pendingMinuteRef.current = minute;
      if (rafRef.current) return; // already scheduled
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingMinuteRef.current !== null) {
          onMinuteChange(pendingMinuteRef.current);
          pendingMinuteRef.current = null;
        }
      });
    },
    [onMinuteChange]
  );

  // Compute minute from a pointer x position on the track
  const minuteFromPointer = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return localMinute;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(pct * 1439);
  }, [localMinute]);

  const handleTrackPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      const m = minuteFromPointer(e.clientX);
      setLocalMinute(m);
      fireChange(m);
    },
    [minuteFromPointer, fireChange]
  );

  const handleTrackPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const m = minuteFromPointer(e.clientX);
      setLocalMinute(m);
      fireChange(m);
    },
    [isDragging, minuteFromPointer, fireChange]
  );

  const handleTrackPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      const m = minuteFromPointer(e.clientX);
      setLocalMinute(m);
      onMinuteChange(m);
    },
    [isDragging, minuteFromPointer, onMinuteChange]
  );

  const handlePlayPointerDown = useCallback((e: React.PointerEvent) => {
    // Prevent bubbling to slider wrapper (sliderInteracting) and root (stopPlay)
    e.stopPropagation();
  }, []);

  const displayMinute = isDragging ? localMinute : minuteOfDay;
  const sunrisePct = (sunriseMinute / 1440) * 100;
  const sunsetPct = (sunsetMinute / 1440) * 100;
  const currentPct = (displayMinute / 1440) * 100;

  return (
    <div className="relative space-y-1.5">
      {/* Large floating time — always visible, follows thumb */}
      <div
        className="absolute z-20 pointer-events-none -translate-x-1/2"
        style={{
          left: `${currentPct}%`,
          bottom: 40,
        }}
      >
        <span
          className="text-4xl font-semibold tracking-tight whitespace-nowrap"
          style={{
            color: "rgba(255,255,255,0.85)",
            textShadow:
              "0 2px 16px rgba(0,0,0,0.7), 0 0 4px rgba(0,0,0,0.4)",
          }}
        >
          {formatMinuteOfDay(displayMinute)}
        </span>
      </div>

      {/* Time + play button row */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          onPointerDown={handlePlayPointerDown}
          className={cn("glass-play-btn shrink-0", isPlaying && "playing")}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>
        <span
          className="text-xs font-medium tracking-tight"
          style={{
            color: "rgba(255,255,255,0.7)",
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}
        >
          {formatMinuteOfDay(displayMinute)}
        </span>
        {isNight && <Moon className="w-3 h-3 text-blue-300/50" />}
      </div>

      {/* Track — direct pointer events for reliable mobile tap + drag */}
      <div
        ref={trackRef}
        className="relative touch-none select-none cursor-pointer"
        style={{ padding: "10px 0" }}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handleTrackPointerMove}
        onPointerUp={handleTrackPointerUp}
        onPointerCancel={handleTrackPointerUp}
      >
        <div className="h-2.5 rounded-full overflow-hidden relative">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right,
                rgba(26, 26, 62, 0.6) 0%,
                rgba(26, 26, 62, 0.6) ${sunrisePct}%,
                #f59e0b ${sunrisePct + 2}%,
                #fbbf24 ${(sunrisePct + sunsetPct) / 2}%,
                #f59e0b ${sunsetPct - 2}%,
                rgba(26, 26, 62, 0.6) ${sunsetPct}%,
                rgba(26, 26, 62, 0.6) 100%
              )`,
            }}
          />
          <div
            className="absolute top-0 left-0 h-full bg-white/15 rounded-full"
            style={{ width: `${currentPct}%` }}
          />
        </div>

        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full pointer-events-none"
          style={{
            left: `calc(${currentPct}% - 8px)`,
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))",
            boxShadow:
              "0 1px 6px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.3)",
          }}
        />
      </div>
    </div>
  );
}
