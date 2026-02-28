"use client";

import { useState } from "react";
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { NEIGHBORHOOD_LABELS } from "@/lib/constants";
import type { QuickFilterState, SunFilter, FoodFilter, SettingFilter } from "@/lib/types";

const FOOD_OPTIONS: { value: FoodFilter; label: string; icon: string }[] = [
  { value: "food", label: "Grub", icon: "🍽️" },
  { value: "drinks", label: "Booze!", icon: "🍺" },
  { value: "all", label: "Either", icon: "🤷" },
];

const SETTING_OPTIONS: { value: SettingFilter; label: string; icon: string }[] = [
  { value: "patio", label: "Patio", icon: "🕺" },
  { value: "rooftop", label: "Rooftop", icon: "🏙️" },
  { value: "all", label: "Either", icon: "🤷" },
];

const SUN_OPTIONS: { value: SunFilter; label: string; icon: string }[] = [
  { value: "sun", label: "Sun", icon: "☀️" },
  { value: "shade", label: "Shade", icon: "🌥️" },
  { value: "all", label: "Either", icon: "🌤️" },
];

// Show these neighborhoods first — most popular for patios
const TOP_NEIGHBORHOODS = [
  "RIVER NORTH",
  "OLD TOWN",
  "LINCOLN PARK",
  "WICKER PARK",
  "WEST LOOP",
  "LAKEVIEW",
  "GOLD COAST",
  "BUCKTOWN",
];

function titleCase(s: string) {
  return s
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

interface QuickFilterProps {
  filters: QuickFilterState;
  onFiltersChange: (filters: QuickFilterState) => void;
  filteredCount: number;
  totalCount: number;
  neighborhoodsWithPatios: Set<string>;
  onNeighborhoodFlyTo?: (name: string) => void;
  currentTime: Date;
  isOpen: boolean;
  onToggle: () => void;
}

export function QuickFilter({
  filters,
  onFiltersChange,
  filteredCount,
  totalCount,
  neighborhoodsWithPatios,
  onNeighborhoodFlyTo,
  currentTime,
  isOpen,
  onToggle,
}: QuickFilterProps) {
  const [showAllNeighborhoods, setShowAllNeighborhoods] = useState(false);

  const activeFilterCount =
    filters.neighborhoods.length +
    (filters.food !== "all" ? 1 : 0) +
    (filters.setting !== "all" ? 1 : 0) +
    (filters.sunPreference !== "all" ? 1 : 0) +
    (filters.openOnly ? 1 : 0) +
    (filters.lateNight ? 1 : 0);

  const toggleNeighborhood = (name: string) => {
    const isAdding = !filters.neighborhoods.includes(name);
    const neighborhoods = isAdding
      ? [...filters.neighborhoods, name]
      : filters.neighborhoods.filter((n) => n !== name);
    onFiltersChange({ ...filters, neighborhoods });
    if (isAdding && onNeighborhoodFlyTo) {
      onNeighborhoodFlyTo(name);
    }
  };

  const setFood = (pref: FoodFilter) => {
    onFiltersChange({ ...filters, food: pref });
  };

  const setSetting = (pref: SettingFilter) => {
    onFiltersChange({ ...filters, setting: pref });
  };

  const setSunPreference = (pref: SunFilter) => {
    onFiltersChange({ ...filters, sunPreference: pref });
  };

  const clearAll = () => {
    onFiltersChange({ neighborhoods: [], food: "all", setting: "all", sunPreference: "all", openOnly: false, lateNight: false });
  };

  // Neighborhoods that actually have patios, in display order
  const topDisplay = TOP_NEIGHBORHOODS.filter((n) =>
    neighborhoodsWithPatios.has(n)
  );
  const allWithPatios = NEIGHBORHOOD_LABELS.map((n) => n.name).filter((n) =>
    neighborhoodsWithPatios.has(n)
  );
  const extraNeighborhoods = allWithPatios.filter(
    (n) => !TOP_NEIGHBORHOODS.includes(n)
  );
  const displayedNeighborhoods = showAllNeighborhoods
    ? [...topDisplay, ...extraNeighborhoods]
    : topDisplay;

  const pill = (active: boolean, variant: "amber" | "green" | "indigo" = "amber") =>
    cn(
      "glass-pill",
      active && (variant === "green" ? "glass-pill-green" : variant === "indigo" ? "glass-pill-indigo" : "glass-pill-amber")
    );

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={onToggle}
        className={cn(
          "glass-panel flex items-center gap-2 px-4 py-3 rounded-full text-sm font-medium transition-all",
          isOpen
            ? "bg-white/[0.18] text-white border-white/25"
            : "text-white/65 hover:text-white hover:bg-white/[0.08]"
        )}
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-white/25 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filter panel */}
      {isOpen && (
        <div className="glass-panel rounded-[20px] p-3 w-[calc(100vw-2rem)] sm:w-80 mt-2 quick-filter-enter">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/90 font-semibold text-xs tracking-tight">
              What are you looking for?
            </h3>
            <button
              onClick={onToggle}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Neighborhood section */}
          <div className="mb-3">
            <label className="text-white/35 text-[10px] font-medium uppercase tracking-wider mb-1.5 block">
              Neighborhood
            </label>
            <div className="flex flex-wrap gap-1.5">
              {displayedNeighborhoods.map((name) => (
                <button
                  key={name}
                  onClick={() => toggleNeighborhood(name)}
                  className={pill(filters.neighborhoods.includes(name))}
                >
                  {titleCase(name)}
                </button>
              ))}
            </div>
            {extraNeighborhoods.length > 0 && (
              <button
                onClick={() => setShowAllNeighborhoods((v) => !v)}
                className="flex items-center gap-1 text-xs text-white/25 hover:text-white/45 mt-2 transition-colors"
              >
                {showAllNeighborhoods ? (
                  <>
                    Show less <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    {extraNeighborhoods.length} more{" "}
                    <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Food section */}
          <div className="mb-3">
            <label className="text-white/35 text-[10px] font-medium uppercase tracking-wider mb-1.5 block">
              Food
            </label>
            <div className="flex gap-1.5">
              {FOOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFood(opt.value)}
                  className={pill(filters.food === opt.value)}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Setting section */}
          <div className="mb-3">
            <label className="text-white/35 text-[10px] font-medium uppercase tracking-wider mb-1.5 block">
              Setting
            </label>
            <div className="flex gap-1.5">
              {SETTING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSetting(opt.value)}
                  className={pill(filters.setting === opt.value)}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hours section */}
          <div className="mb-3">
            <label className="text-white/35 text-[10px] font-medium uppercase tracking-wider mb-1.5 block">
              Hours
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onFiltersChange({ ...filters, openOnly: true })}
                className={pill(filters.openOnly, "green")}
              >
                <span>🟢</span>
                Open at {formatTime(currentTime)}
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, openOnly: false })}
                className={pill(!filters.openOnly)}
              >
                <span>🕐</span>
                Any
              </button>
              <button
                onClick={() => onFiltersChange({ ...filters, lateNight: !filters.lateNight })}
                className={pill(filters.lateNight, "indigo")}
              >
                <span>🌙</span>
                Open Late (4am+)
              </button>
            </div>
          </div>

          {/* Sun preference */}
          <div className="mb-4">
            <label className="text-white/35 text-xs font-medium uppercase tracking-wider mb-2 block">
              Sunlight
            </label>
            <div className="flex gap-1.5">
              {SUN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSunPreference(opt.value)}
                  className={pill(filters.sunPreference === opt.value)}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
            <span className="text-xs text-white/35">
              <span className="text-white/65 font-medium">{filteredCount}</span>
              {filteredCount !== totalCount && ` of ${totalCount}`} patios
            </span>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-white/40 hover:text-white/65 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
