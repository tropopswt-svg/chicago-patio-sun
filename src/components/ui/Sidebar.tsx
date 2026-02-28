"use client";

import { useState } from "react";
import { Search, Sun, Cloud, LayoutGrid, Building2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PatioCard } from "./PatioCard";
import type { PatioWithSunStatus, SunFilter } from "@/lib/types";

export type HoursFilter = "all" | "open" | "closed";

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
  hoursFilter: HoursFilter;
  onHoursFilterChange: (filter: HoursFilter) => void;
}

const hoursFilters: { value: HoursFilter; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: <Clock className="w-3.5 h-3.5" /> },
  { value: "open", label: "Open", icon: <span className="text-xs">🟢</span> },
  { value: "closed", label: "Closed", icon: <span className="text-xs">🔴</span> },
];

const filters: { value: SunFilter; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { value: "sun", label: "Sun", icon: <Sun className="w-3.5 h-3.5" /> },
  { value: "shade", label: "Shade", icon: <Cloud className="w-3.5 h-3.5" /> },
  { value: "rooftop", label: "Rooftop", icon: <Building2 className="w-3.5 h-3.5" /> },
];

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
  hoursFilter,
  onHoursFilterChange,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SunFilter>("all");

  // Strip punctuation so "codys" matches "Cody's", "ranallis" matches "Ranalli's", etc.
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "");

  // patios are already hours-filtered by page.tsx, just apply sun + search here
  const filtered = patios
    .filter((p) => {
      if (filter === "sun") return p.inSun;
      if (filter === "shade") return !p.inSun;
      if (filter === "rooftop") return p.rooftop === true;
      return true;
    })
    .filter(
      (p) =>
        !search ||
        normalize(p.name).includes(normalize(search)) ||
        normalize(p.address).includes(normalize(search))
    );

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

        {/* Filter tabs */}
        <div className="order-4 px-4 pb-2 flex gap-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "glass-pill",
                filter === f.value && "glass-pill-amber"
              )}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        {/* Hours filter tabs */}
        <div className="order-5 px-4 pb-2 flex gap-1">
          {hoursFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => onHoursFilterChange(f.value)}
              className={cn(
                "glass-pill",
                hoursFilter === f.value && "glass-pill-green"
              )}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        {/* Patio list */}
        <div className="order-6 flex-1 overflow-y-auto px-2 pb-4 space-y-1 min-h-0 pb-safe">
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
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
