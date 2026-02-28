"use client";

import { useState, useRef, useCallback } from "react";
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
  const [isDragging, setIsDragging] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sunrisePct = (sunriseMinute / 1440) * 100;
  const sunsetPct = (sunsetMinute / 1440) * 100;
  const currentPct = (minuteOfDay / 1440) * 100;

  // Track height in px
  const TRACK_H = 180;

  // Thumb vertical offset from top of track container
  const thumbTop = TRACK_H - (currentPct / 100) * TRACK_H;

  const handleDragStart = useCallback(() => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    setIsFading(false);
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsFading(true);
    fadeTimer.current = setTimeout(() => {
      setIsDragging(false);
      setIsFading(false);
    }, 500);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2 relative">
      {/* Large floating time popup — appears during drag */}
      {isDragging && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: 40,
            top: thumbTop - 18,
            transition: isFading ? "opacity 0.5s ease-out" : "top 0.05s linear",
            opacity: isFading ? 0 : 1,
          }}
        >
          <span
            className="text-3xl font-semibold tracking-tight whitespace-nowrap"
            style={{
              color: "rgba(255,255,255,0.85)",
              textShadow:
                "0 2px 12px rgba(0,0,0,0.7), 0 0 4px rgba(0,0,0,0.4)",
            }}
          >
            {formatMinuteOfDay(minuteOfDay)}
          </span>
        </div>
      )}

      {/* Track container — rotated horizontal slider rendered vertically */}
      <div className="relative" style={{ width: 28, height: TRACK_H }}>
        <div
          className="absolute"
          style={{
            width: TRACK_H,
            height: 28,
            transform: "rotate(-90deg)",
            transformOrigin: "top left",
            top: TRACK_H,
            left: 0,
          }}
        >
          <div className="relative w-full" style={{ paddingTop: 8 }}>
            {/* Thicker track */}
            <div className="h-2.5 rounded-full overflow-hidden relative">
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right,
                    rgba(26, 26, 62, 0.6) 0%,
                    rgba(26, 26, 62, 0.6) ${sunrisePct}%,
                    #f59e0b ${sunrisePct + 5}%,
                    #fbbf24 ${(sunrisePct + sunsetPct) / 2}%,
                    #f59e0b ${sunsetPct - 5}%,
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
              value={minuteOfDay}
              onChange={(e) => onMinuteChange(parseInt(e.target.value))}
              onMouseDown={handleDragStart}
              onMouseUp={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchEnd={handleDragEnd}
              className="absolute w-full h-8 opacity-0 cursor-pointer"
              style={{ top: 2, left: 0 }}
            />

            {/* Thumb */}
            <div
              className="absolute -translate-y-1/2 w-4 h-4 rounded-full pointer-events-none transition-[left] duration-75"
              style={{
                top: "50%",
                marginTop: 1,
                left: `calc(${currentPct}% - 8px)`,
                background:
                  "linear-gradient(160deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))",
                boxShadow:
                  "0 1px 6px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.3)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Time label + play button below the track */}
      <div className="flex flex-col items-center gap-1.5">
        <span
          className="text-[10px] font-medium tracking-tight whitespace-nowrap"
          style={{
            color: "rgba(255,255,255,0.7)",
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}
        >
          {formatMinuteOfDay(minuteOfDay)}
        </span>
        <button
          onClick={onTogglePlay}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center transition-all",
            isPlaying
              ? "bg-white/20 text-white"
              : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white"
          )}
        >
          {isPlaying ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3 ml-0.5" />
          )}
        </button>
        {isNight && <Moon className="w-3 h-3 text-blue-300/50" />}
      </div>
    </div>
  );
}
