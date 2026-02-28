"use client";

import { useRef, useState, useEffect } from "react";
import { MapPin, Sun, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatioPhoto } from "@/hooks/usePatioPhoto";
import { usePatioBusyness, getBusynessLevel } from "@/hooks/usePatioBusyness";
import type { PatioWithSunStatus } from "@/lib/types";

interface PatioCardProps {
  patio: PatioWithSunStatus;
  isSelected: boolean;
  onClick: () => void;
  minuteOfDay: number;
}

export function PatioCard({ patio, isSelected, onClick, minuteOfDay }: PatioCardProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { photoUrl, hours, isOpen, isLoading } = usePatioPhoto(patio, isVisible);
  const { forecast } = usePatioBusyness(patio, isVisible);
  const busyness = getBusynessLevel(forecast, minuteOfDay);
  const showPhoto = photoUrl && !imgError;

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-xl transition-all",
        "hover:bg-white/5 active:scale-[0.98]",
        isSelected
          ? "bg-white/10 ring-1 ring-amber-500/50"
          : "bg-transparent"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Photo thumbnail or sun/shade icon fallback */}
        {showPhoto ? (
          <img
            src={photoUrl}
            alt=""
            onError={() => setImgError(true)}
            className="mt-0.5 w-12 h-12 rounded-lg object-cover shrink-0"
          />
        ) : isLoading ? (
          <div className="mt-0.5 w-12 h-12 rounded-lg shrink-0 bg-white/5 animate-pulse" />
        ) : (
          <div
            className={cn(
              "mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              patio.inSun
                ? "bg-amber-500/20 text-amber-400"
                : "bg-gray-500/20 text-gray-400"
            )}
          >
            {patio.inSun ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Cloud className="w-4 h-4" />
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-white truncate">
            {patio.name}
          </h3>
          {patio.address && (
            <p className="text-xs text-white/40 truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />
              {patio.address}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span
              className={cn(
                "inline-block text-xs px-2 py-0.5 rounded-full",
                patio.inSun
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-gray-500/20 text-gray-400"
              )}
            >
              {patio.inSun ? "\u2600\uFE0F In Sun" : "\uD83C\uDF25\uFE0F In Shade"}
            </span>
            {patio.rooftop && (
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                Rooftop
              </span>
            )}
            {patio.lateNight && (
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                🌙 Late
              </span>
            )}
            {hours !== null && (
              <span
                className={cn(
                  "inline-block text-xs px-2 py-0.5 rounded-full",
                  isOpen
                    ? "bg-green-500/20 text-green-300"
                    : "bg-gray-500/20 text-gray-400"
                )}
              >
                {isOpen ? `Open \u00B7 ${hours}` : `Closed \u00B7 ${hours}`}
              </span>
            )}
            {busyness && (
              <span
                className={cn(
                  "inline-block text-xs px-2 py-0.5 rounded-full",
                  busyness.label === "Busy"
                    ? "bg-red-500/20 text-red-300"
                    : busyness.label === "Moderate"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-green-500/20 text-green-300"
                )}
              >
                {busyness.label}
              </span>
            )}
          </div>
          {patio.sunTag && (
            <span className="block mt-1 text-[11px] text-white/50">
              {patio.sunTag}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
