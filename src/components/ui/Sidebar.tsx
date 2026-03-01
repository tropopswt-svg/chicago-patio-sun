"use client";

import { useState, useMemo } from "react";
import { Search, Sun, Cloud, Building2, SlidersHorizontal, X } from "lucide-react";
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
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount =
    (sunFilter !== "all" ? 1 : 0) + (hoursStatus !== "all" ? 1 : 0);

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
        "absolute z-20 transition-transform duration-300 will-change-transform",
        // Mobile: bottom sheet
        "bottom-0 left-0 right-0 h-[65dvh]",
        // Desktop: right sidebar (unchanged)
        "sm:top-0 sm:right-0 sm:left-auto sm:bottom-auto sm:h-full sm:w-80 md:w-96",
        isOpen
          ? "translate-y-0 sm:translate-x-0"
          : "translate-y-full sm:translate-y-0 sm:translate-x-full"
      )}
    >
      <div
        className="h-full rounded-t-[20px] sm:rounded-t-none sm:rounded-l-[20px] flex flex-col overflow-hidden"
        style={{
          background: "linear-gradient(160deg, rgba(20, 20, 45, 0.92) 0%, rgba(15, 15, 35, 0.96) 100%)",
          border: "0.5px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Drag handle — mobile only */}
        <div className="order-1 sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Stats bar + filter button */}
        <div className="order-2 px-4 pt-2 sm:pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-amber-400/90 font-medium">
              ☀️ {sunCount} in sun
            </span>
            <span className="text-white/15">|</span>
            <span className="text-white/50">
              🌥️ {shadeCount} in shade
            </span>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                showFilters || activeFilterCount > 0
                  ? "bg-white/15 text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.08]"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
            {activeFilterCount > 0 && !showFilters && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            {showFilters && (
              <div
                className="absolute top-full right-0 mt-1 z-30 p-3 rounded-2xl w-48 quick-filter-enter"
                style={{
                  background: "linear-gradient(160deg, rgba(20, 20, 45, 0.95) 0%, rgba(15, 15, 35, 0.98) 100%)",
                  border: "0.5px solid rgba(255, 255, 255, 0.15)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Filters</span>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white/30 hover:text-white/60"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    onClick={() => setHoursStatus((h) => (h === "open" ? "all" : "open"))}
                    className={cn("glass-pill", hoursStatus === "open" && "glass-pill-green")}
                  >
                    <span className="text-xs">🟢</span> Open
                  </button>
                  <button
                    onClick={() => setHoursStatus((h) => (h === "closed" ? "all" : "closed"))}
                    className={cn("glass-pill", hoursStatus === "closed" && "glass-pill-green")}
                  >
                    <span className="text-xs">🔴</span> Closed
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setSunFilter((f) => (f === "sun" ? "all" : "sun"))}
                    className={cn("glass-pill w-full justify-center", sunFilter === "sun" && "glass-pill-amber")}
                  >
                    <Sun className="w-3.5 h-3.5" /> Sun
                  </button>
                  <button
                    onClick={() => setSunFilter((f) => (f === "shade" ? "all" : "shade"))}
                    className={cn("glass-pill w-full justify-center", sunFilter === "shade" && "glass-pill-amber")}
                  >
                    <Cloud className="w-3.5 h-3.5" /> Shade
                  </button>
                  <button
                    onClick={() => setSunFilter((f) => (f === "rooftop" ? "all" : "rooftop"))}
                    className={cn("glass-pill w-full justify-center", sunFilter === "rooftop" && "glass-pill-amber")}
                  >
                    <Building2 className="w-3.5 h-3.5" /> Rooftop
                  </button>
                </div>
              </div>
            )}
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

        {/* Day picker + Time input */}
        <div className="order-4 px-4 pb-2 flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowDayPicker((v) => !v)}
              className={cn("glass-pill", "glass-pill-amber")}
            >
              {dayOptions[selectedDayIndex]?.label ?? "Today"}
            </button>
            {showDayPicker && (
              <div className="absolute top-full left-0 mt-1 z-30 flex gap-1 p-1.5 rounded-2xl quick-filter-enter"
                style={{
                  background: "linear-gradient(160deg, rgba(20, 20, 45, 0.95) 0%, rgba(15, 15, 35, 0.98) 100%)",
                  border: "0.5px solid rgba(255, 255, 255, 0.15)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                }}
              >
                {dayOptions.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      handleDaySelect(i);
                      setShowDayPicker(false);
                    }}
                    className={cn(
                      "glass-pill whitespace-nowrap",
                      selectedDayIndex === i && "glass-pill-amber"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="time"
            value={timeValue}
            onChange={handleTimeInput}
            className="glass-input px-3 py-1.5 text-sm w-[120px]"
          />
        </div>

        {/* Patio list */}
        <div
          className="order-7 flex-1 overflow-y-auto px-2 pb-4 space-y-2 min-h-0 pb-safe"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            willChange: "scroll-position",
          }}
        >
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
