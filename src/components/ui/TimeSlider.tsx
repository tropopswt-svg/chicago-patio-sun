"use client";

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

  const sunrisePct = (sunriseMinute / 1440) * 100;
  const sunsetPct = (sunsetMinute / 1440) * 100;
  const currentPct = (minuteOfDay / 1440) * 100;

  return (
    <div className="space-y-1.5">
      {/* Time + play button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0",
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
        <span
          className="text-xs font-medium tracking-tight"
          style={{
            color: "rgba(255,255,255,0.75)",
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}
        >
          {formatMinuteOfDay(minuteOfDay)}
        </span>
        {isNight && <Moon className="w-3 h-3 text-blue-300/50" />}
      </div>

      {/* Bare slider track */}
      <div className="relative">
        <div className="h-1.5 rounded-full overflow-hidden relative">
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
          className="absolute inset-0 w-full h-1.5 opacity-0 cursor-pointer"
        />

        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full pointer-events-none transition-[left] duration-75"
          style={{
            left: `calc(${currentPct}% - 7px)`,
            background: "linear-gradient(160deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))",
            boxShadow: "0 1px 6px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.3)",
          }}
        />
      </div>
    </div>
  );
}
