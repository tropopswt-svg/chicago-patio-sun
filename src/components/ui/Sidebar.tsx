"use client";

import { useState, useMemo } from "react";
import { Search, Sun, Cloud, Building2 } from "lucide-react";
import { addDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { PatioCard } from "./PatioCard";
import { isOpenAt } from "@/lib/hours";
import type { PatioWithSunStatus } from "@/lib/types";

type HoursStatus = "all" | "open" | "closed";
type SunStatus = "all" | "sun" | "shade" | "rooftop";

interface SidebarProps {
  patios: PatioWithSunStatus[];
  sunCount: number;
  shadeCount: number;
  selectedPatioId: string | null;
  onPatioSelect: (id: string, lng: number, lat: number) => void;
  onPatioDetail: (patio: PatioWithSunStatus) => void;
  isOpen: boolean;
  isLoading: boolean;
  currentTime: Date;
  minuteOfDay: number;
  onDateChange: (date: Date) => void;
  onTimeChange: (minute: number) => void;
  hourlyTemperatures?: number[];
}

function generateDayOptions(): { label: string; date: Date }[] {
  const today = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = addDays(today, i);
    let label: string;
    if (i === 0) label = "Today";
    else if (i === 1) label = "Tmrw";
    else label = format(d, "EEE");
    return { label, date: d };
  });
}

export function Sidebar({
  patios,
  sunCount,
  shadeCount,
  selectedPatioId,
  onPatioSelect,
  onPatioDetail,
  isOpen,
  isLoading,
  currentTime,
  minuteOfDay,
  onDateChange,
  onTimeChange,
  hourlyTemperatures,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [sunFilter, setSunFilter] = useState<SunStatus>("all");
  const [hoursStatus, setHoursStatus] = useState<HoursStatus>("all");

  const dayOptions = useMemo(() => generateDayOptions(), []);

  // Determine which day pill is active based on currentTime
  const selectedDayIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const current = new Date(currentTime);
    current.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (current.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, Math.min(5, diffDays));
  }, [currentTime]);

  // Format minuteOfDay to HH:MM for the time input
  const timeValue = useMemo(() => {
    const h = Math.floor(minuteOfDay / 60);
    const m = minuteOfDay % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }, [minuteOfDay]);

  // Compute temperature at the selected day + hour
  const currentTemperature = useMemo(() => {
    if (!hourlyTemperatures || hourlyTemperatures.length === 0) return null;
    const hourIndex = selectedDayIndex * 24 + Math.floor(minuteOfDay / 60);
    const idx = Math.max(0, Math.min(hourIndex, hourlyTemperatures.length - 1));
    return hourlyTemperatures[idx] ?? null;
  }, [hourlyTemperatures, selectedDayIndex, minuteOfDay]);

  // Strip punctuation so "codys" matches "Cody's", "ranallis" matches "Ranalli's", etc.
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "");

  // Apply local filters: sun/shade, open/closed, and search
  const filtered = patios
    .filter((p) => {
      if (sunFilter === "sun") return p.inSun;
      if (sunFilter === "shade") return !p.inSun;
      if (sunFilter === "rooftop") return p.rooftop === true;
      return true;
    })
    .filter((p) => {
      if (hoursStatus === "all") return true;
      const open = isOpenAt(p.openingHours, currentTime);
      if (hoursStatus === "open") return open !== false;
      if (hoursStatus === "closed") return open === false;
      return true;
    })
    .filter(
      (p) =>
        !search ||
        normalize(p.name).includes(normalize(search)) ||
        normalize(p.address).includes(normalize(search))
    );

  const handleDaySelect = (index: number) => {
    onDateChange(dayOptions[index].date);
  };

  const handleTimeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.target.value.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      onTimeChange(h * 60 + m);
    }
  };

  return (
    <div
      className={cn(
        "absolute z-20 transition-transform duration-300",
        // Mobile: bottom sheet
        "bottom-0 left-0 right-0 h-[85vh]",
        // Desktop: right sidebar (unchanged)
        "sm:top-0 sm:right-0 sm:left-auto sm:bottom-auto sm:h-full sm:w-80 md:w-96",
        isOpen
          ? "translate-y-0 sm:translate-x-0"
          : "translate-y-full sm:translate-y-0 sm:translate-x-full"
      )}
    >
      <div className="glass-panel-heavy h-full rounded-t-[20px] sm:rounded-t-none sm:rounded-l-[20px] flex flex-col overflow-hidden">
        {/* Drag handle — mobile only */}
        <div className="order-1 sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Stats bar */}
        <div className="order-2 px-4 pt-2 sm:pt-4 pb-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-amber-400/90 font-medium">
              ☀️ {sunCount} in sun
            </span>
            <span className="text-white/15">|</span>
            <span className="text-white/50">
              🌥️ {shadeCount} in shade
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="order-3 px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input
              type="text"
              placeholder="Search patios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Day picker pills */}
        <div className="order-4 px-4 pb-2 flex gap-1 flex-wrap">
          {dayOptions.map((day, i) => (
            <button
              key={i}
              onClick={() => handleDaySelect(i)}
              className={cn(
                "glass-pill",
                selectedDayIndex === i && "glass-pill-amber"
              )}
            >
              {day.label}
            </button>
          ))}
        </div>

        {/* Time input */}
        <div className="order-5 px-4 pb-2 flex items-center gap-2">
          <input
            type="time"
            value={timeValue}
            onChange={handleTimeInput}
            className="glass-input px-3 py-1.5 text-sm w-[120px]"
          />
          <span className="text-white/40 text-xs">
            {format(currentTime, "h:mm a")}
          </span>
        </div>

        {/* Status filter pills */}
        <div className="order-6 px-4 pb-2 flex gap-1 flex-wrap">
          <button
            onClick={() =>
              setHoursStatus((h) => (h === "open" ? "all" : "open"))
            }
            className={cn(
              "glass-pill",
              hoursStatus === "open" && "glass-pill-green"
            )}
          >
            <span className="text-xs">🟢</span> Open
          </button>
          <button
            onClick={() =>
              setHoursStatus((h) => (h === "closed" ? "all" : "closed"))
            }
            className={cn(
              "glass-pill",
              hoursStatus === "closed" && "glass-pill-green"
            )}
          >
            <span className="text-xs">🔴</span> Closed
          </button>
          <button
            onClick={() =>
              setSunFilter((f) => (f === "sun" ? "all" : "sun"))
            }
            className={cn(
              "glass-pill",
              sunFilter === "sun" && "glass-pill-amber"
            )}
          >
            <Sun className="w-3.5 h-3.5" /> Sun
          </button>
          <button
            onClick={() =>
              setSunFilter((f) => (f === "shade" ? "all" : "shade"))
            }
            className={cn(
              "glass-pill",
              sunFilter === "shade" && "glass-pill-amber"
            )}
          >
            <Cloud className="w-3.5 h-3.5" /> Shade
          </button>
          <button
            onClick={() =>
              setSunFilter((f) => (f === "rooftop" ? "all" : "rooftop"))
            }
            className={cn(
              "glass-pill",
              sunFilter === "rooftop" && "glass-pill-amber"
            )}
          >
            <Building2 className="w-3.5 h-3.5" /> Rooftop
          </button>
        </div>

        {/* Patio list */}
        <div className="order-7 flex-1 overflow-y-auto px-2 pb-4 space-y-1 min-h-0 pb-safe">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/15 border-t-white/50 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-white/25 text-sm">
              No patios found
            </div>
          ) : (
            filtered.map((patio) => (
              <PatioCard
                key={patio.id}
                patio={patio}
                isSelected={patio.id === selectedPatioId}
                onClick={() => onPatioDetail(patio)}
                minuteOfDay={minuteOfDay}
                temperature={currentTemperature}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
