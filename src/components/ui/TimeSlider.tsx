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

const DEBOUNCE_MS = 200;

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state from parent when not dragging
  useEffect(() => {
    if (!isDragging) setLocalMinute(minuteOfDay);
  }, [minuteOfDay, isDragging]);

  const fireChange = useCallback(
    (minute: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onMinuteChange(minute);
      }, DEBOUNCE_MS);
    },
    [onMinuteChange]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value);
      setLocalMinute(v);
      fireChange(v);
    },
    [fireChange]
  );

  const handlePointerDown = useCallback(() => setIsDragging(true), []);
  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    // Flush final value immediately
    if (timerRef.current) clearTimeout(timerRef.current);
    onMinuteChange(localMinute);
  }, [localMinute, onMinuteChange]);

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

      {/* Track */}
      <div className="relative">
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

        <input
          type="range"
          min={0}
          max={1439}
          value={displayMinute}
          onChange={handleChange}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onTouchEnd={handlePointerUp}
          className="absolute inset-0 w-full h-2.5 opacity-0 cursor-pointer"
        />

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
