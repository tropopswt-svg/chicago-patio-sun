"use client";

import { useRef, useState, useEffect } from "react";
import { MapPin, Sun, Cloud, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePatioPhoto } from "@/hooks/usePatioPhoto";
import { usePatioBusyness, getBusynessLevel } from "@/hooks/usePatioBusyness";
import type { PatioWithSunStatus } from "@/lib/types";

interface PatioCardProps {
  patio: PatioWithSunStatus;
  isSelected: boolean;
  onClick: () => void;
  minuteOfDay: number;
  temperature?: number | null;
}

export function PatioCard({ patio, isSelected, onClick, minuteOfDay, temperature }: PatioCardProps) {
  const { user, isFavorite, toggleFavorite } = useAuth();
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
        "w-full text-left p-3 rounded-2xl transition-all",
        "hover:bg-white/[0.05] active:scale-[0.98]",
        isSelected
          ? "bg-white/[0.08] ring-1 ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
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
            className="mt-0.5 w-12 h-12 rounded-xl object-cover shrink-0"
          />
        ) : isLoading ? (
          <div className="mt-0.5 w-12 h-12 rounded-xl shrink-0 bg-white/[0.04] animate-pulse" />
        ) : (
          <div
            className={cn(
              "mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              patio.inSun
                ? "bg-amber-500/15 text-amber-400"
                : "bg-white/[0.06] text-white/40"
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
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-medium text-white/90 truncate tracking-tight flex-1">
              {patio.name}
            </h3>
            {user && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(patio.id);
                }}
                className="shrink-0 transition-transform active:scale-90"
              >
                <Heart
                  className={cn(
                    "w-3.5 h-3.5 transition-colors",
                    isFavorite(patio.id) ? "fill-red-500 text-red-500" : "text-white/20 hover:text-white/50"
                  )}
                />
              </button>
            )}
          </div>
          {patio.address && (
            <p className="text-xs text-white/35 truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />
              {patio.address}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className={cn("glass-badge", patio.inSun ? "glass-badge-sun" : "glass-badge-shade")}>
              {patio.inSun ? "☀️ In Sun" : "🌥️ In Shade"}
            </span>
            {patio.rooftop && (
              <span className="glass-badge glass-badge-rooftop">
                Rooftop
              </span>
            )}
            {patio.lateNight && (
              <span className="glass-badge glass-badge-late">
                🌙 Late
              </span>
            )}
            {hours !== null && (
              <span className={cn("glass-badge", isOpen ? "glass-badge-open" : "glass-badge-closed")}>
                {isOpen ? `Open · ${hours}` : `Closed · ${hours}`}
              </span>
            )}
            {temperature != null && (
              <span
                className="glass-badge font-semibold"
                style={{
                  background:
                    temperature >= 85
                      ? "rgba(239, 68, 68, 0.2)"
                      : temperature >= 70
                      ? "rgba(245, 158, 11, 0.2)"
                      : temperature >= 55
                      ? "rgba(34, 197, 94, 0.18)"
                      : temperature >= 40
                      ? "rgba(56, 189, 248, 0.18)"
                      : "rgba(99, 102, 241, 0.2)",
                  borderColor:
                    temperature >= 85
                      ? "rgba(239, 68, 68, 0.2)"
                      : temperature >= 70
                      ? "rgba(245, 158, 11, 0.2)"
                      : temperature >= 55
                      ? "rgba(34, 197, 94, 0.15)"
                      : temperature >= 40
                      ? "rgba(56, 189, 248, 0.15)"
                      : "rgba(99, 102, 241, 0.2)",
                  color:
                    temperature >= 85
                      ? "#fca5a5"
                      : temperature >= 70
                      ? "#fcd34d"
                      : temperature >= 55
                      ? "#86efac"
                      : temperature >= 40
                      ? "#7dd3fc"
                      : "#a5b4fc",
                }}
              >
                {Math.round(temperature)}°F
              </span>
            )}
            {busyness && (
              <span
                className={cn(
                  "glass-badge",
                  busyness.label === "Busy"
                    ? "glass-badge-busy"
                    : busyness.label === "Moderate"
                    ? "glass-badge-moderate"
                    : "glass-badge-quiet"
                )}
              >
                {busyness.label}
              </span>
            )}
          </div>
          {patio.sunTag && (
            <span className="block mt-1 text-xs text-white/40">
              {patio.sunTag}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
