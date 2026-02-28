"use client";

import { Play, Pause, Sun, Moon } from "lucide-react";
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
    <div className="glass-panel rounded-[20px] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isNight ? (
            <Moon className="w-4 h-4 text-blue-300/80" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
          <span className="text-sm font-medium text-white/85 tracking-tight">
            {formatMinuteOfDay(minuteOfDay)}
          </span>
        </div>
        <button
          onClick={onTogglePlay}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-all",
            isPlaying
              ? "bg-white/[0.22] text-white shadow-[inset_0_0_12px_rgba(255,255,255,0.1)]"
              : "bg-white/[0.08] text-white/70 hover:bg-white/[0.14] hover:text-white"
          )}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>
      </div>

      <div className="relative">
        {/* Gradient track background */}
        <div className="h-2 rounded-full overflow-hidden relative">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right,
                rgba(26, 26, 62, 0.8) 0%,
                rgba(26, 26, 62, 0.8) ${sunrisePct}%,
                #f59e0b ${sunrisePct + 5}%,
                #fbbf24 ${(sunrisePct + sunsetPct) / 2}%,
                #f59e0b ${sunsetPct - 5}%,
                rgba(26, 26, 62, 0.8) ${sunsetPct}%,
                rgba(26, 26, 62, 0.8) 100%
              )`,
            }}
          />
          {/* Progress overlay */}
          <div
            className="absolute top-0 left-0 h-full bg-white/15 rounded-full"
            style={{ width: `${currentPct}%` }}
          />
        </div>

        {/* Range input */}
        <input
          type="range"
          min={0}
          max={1439}
          value={minuteOfDay}
          onChange={(e) => onMinuteChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
        />

        {/* Thumb — liquid glass orb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full pointer-events-none transition-[left] duration-75"
          style={{
            left: `calc(${currentPct}% - 8px)`,
            background: "linear-gradient(160deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-white/35">
        <span>12 AM</span>
        <span>{formatMinuteOfDay(sunriseMinute)} rise</span>
        <span>{formatMinuteOfDay(sunsetMinute)} set</span>
        <span>12 AM</span>
      </div>

      {isNight && (
        <div className="text-center text-xs text-blue-300/60 bg-blue-500/[0.08] border border-blue-400/[0.08] rounded-full py-1.5">
          Sun is below the horizon
        </div>
      )}
    </div>
  );
}
