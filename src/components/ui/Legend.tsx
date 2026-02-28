"use client";

import { SUNLIT_COLOR, SHADED_COLOR } from "@/lib/constants";

export interface LegendWeather {
  temperature: number;
  uvIndex: number;
  conditionLabel: string;
  conditionIcon: string;
}

interface LegendProps {
  sunCount: number;
  shadeCount: number;
  weather?: LegendWeather | null;
}

export function Legend({ sunCount, shadeCount, weather }: LegendProps) {
  return (
    <div className="glass-panel rounded-[20px] px-4 py-3 flex flex-col gap-2">
      {weather && (
        <div className="flex items-center gap-2 text-xs text-white/70">
          <span>{weather.conditionIcon}</span>
          <span className="text-white/85 font-medium">{Math.round(weather.temperature)}°F</span>
          <span>{weather.conditionLabel}</span>
          <span className="text-white/20">|</span>
          <span>UV {weather.uvIndex}</span>
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: SUNLIT_COLOR, boxShadow: `0 0 8px ${SUNLIT_COLOR}40` }}
          />
          <span className="text-xs text-white/70">
            Sun <span className="text-white/40">({sunCount})</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: SHADED_COLOR }}
          />
          <span className="text-xs text-white/70">
            Shade <span className="text-white/40">({shadeCount})</span>
          </span>
        </div>
      </div>
    </div>
  );
}
