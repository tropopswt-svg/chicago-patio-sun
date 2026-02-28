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
        "absolute top-0 right-0 h-full z-20 transition-transform duration-300",
        "w-full sm:w-80 md:w-96",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="glass-panel h-full rounded-l-2xl flex flex-col overflow-hidden">
        {/* Stats bar */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-amber-400 font-medium">
              ☀️ {sunCount} in sun
            </span>
            <span className="text-white/30">|</span>
            <span className="text-gray-400">
              🌥️ {shadeCount} in shade
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search patios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-4 pb-2 flex gap-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filter === f.value
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-white/40 hover:text-white/60 hover:bg-white/5"
              )}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        {/* Hours filter tabs */}
        <div className="px-4 pb-3 flex gap-1">
          {hoursFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => onHoursFilterChange(f.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                hoursFilter === f.value
                  ? "bg-green-500/20 text-green-300"
                  : "text-white/40 hover:text-white/60 hover:bg-white/5"
              )}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        {/* Patio list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">
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
