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
    <div className="glass-panel rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isNight ? (
            <Moon className="w-4 h-4 text-blue-300" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
          <span className="text-sm font-medium text-white/90">
            {formatMinuteOfDay(minuteOfDay)}
          </span>
        </div>
        <button
          onClick={onTogglePlay}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
            isPlaying
              ? "bg-amber-500 text-black"
              : "bg-white/10 text-white hover:bg-white/20"
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
                #1a1a3e 0%,
                #1a1a3e ${sunrisePct}%,
                #f59e0b ${sunrisePct + 5}%,
                #fbbf24 ${(sunrisePct + sunsetPct) / 2}%,
                #f59e0b ${sunsetPct - 5}%,
                #1a1a3e ${sunsetPct}%,
                #1a1a3e 100%
              )`,
            }}
          />
          {/* Progress indicator */}
          <div
            className="absolute top-0 left-0 h-full bg-white/20 rounded-full"
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

        {/* Thumb indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg shadow-amber-500/30 border-2 border-amber-400 pointer-events-none transition-[left] duration-75"
          style={{ left: `calc(${currentPct}% - 8px)` }}
        />
      </div>

      <div className="flex justify-between text-xs text-white/40">
        <span>12 AM</span>
        <span>{formatMinuteOfDay(sunriseMinute)} rise</span>
        <span>{formatMinuteOfDay(sunsetMinute)} set</span>
        <span>12 AM</span>
      </div>

      {isNight && (
        <div className="text-center text-xs text-blue-300/70 bg-blue-500/10 rounded-lg py-1.5">
          Sun is below the horizon — no sunlight
        </div>
      )}
    </div>
  );
}
