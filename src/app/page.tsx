"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Crosshair, Plus, ZoomOut, X, Sun } from "lucide-react";
import type mapboxgl from "mapbox-gl";

import { MapProvider, useMapContext } from "@/components/providers/MapProvider";
import { Header } from "@/components/ui/Header";
import { TimeSlider } from "@/components/ui/TimeSlider";
import { Sidebar } from "@/components/ui/Sidebar";
import { SunIndicator } from "@/components/ui/SunIndicator";
import { QuickFilter } from "@/components/ui/QuickFilter";
import { useTimeControl } from "@/hooks/useTimeControl";
import { usePatioData } from "@/hooks/usePatioData";
import { useBuildingData } from "@/hooks/useBuildingData";
import { SubmitPatioForm } from "@/components/ui/SubmitPatioForm";
import { PatioDetailPanel } from "@/components/ui/PatioDetailPanel";
import { usePatioSunStatus } from "@/hooks/usePatioSunStatus";
import { useWeatherData } from "@/hooks/useWeatherData";
import { decodeWeatherCode, getHourlySunFactor, getHourlyTemperature } from "@/lib/weather-utils";
import { CHICAGO_CENTER, DEFAULT_ZOOM, DEFAULT_PITCH, DEFAULT_BEARING, NEIGHBORHOOD_LABELS } from "@/lib/constants";
import { getNeighborhood, isFood } from "@/lib/neighborhoods";
import { isOpenAt } from "@/lib/hours";
import type { QuickFilterState, PatioWithSunStatus } from "@/lib/types";

const MapInstance = dynamic(
  () => import("@/components/map/MapInstance"),
  { ssr: false }
);

function AppContent() {
  const { mapRef, setMap, flyTo } = useMapContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPatioId, setSelectedPatioId] = useState<string | null>(null);
  const [mapBearing, setMapBearing] = useState(0);
  const [submitFormOpen, setSubmitFormOpen] = useState(false);
  const [detailPatio, setDetailPatio] = useState<PatioWithSunStatus | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [noSunDismissed, setNoSunDismissed] = useState(false);
  const [mapInteracting, setMapInteracting] = useState(false);
  const [sliderInteracting, setSliderInteracting] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilterState>({
    neighborhoods: [],
    food: "all",
    setting: "all",
    sunPreference: "all",
    openOnly: false,
    lateNight: false,
  });

  const { timeState, sunriseMinute, sunsetMinute, setMinuteOfDay, setCalendarDate, togglePlay, stopPlay } =
    useTimeControl();
  const { patios, isLoading, refreshPatios } = usePatioData();
  const { buildingIndex } = useBuildingData();
  const { weather } = useWeatherData();
  const { patiosWithStatus, sunCount, shadeCount } =
    usePatioSunStatus(patios, buildingIndex, timeState.date, weather);

  // Pre-compute neighborhood for each patio
  const patioNeighborhoods = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of patios) {
      m.set(p.id, getNeighborhood(p.lat, p.lng));
    }
    return m;
  }, [patios]);

  const neighborhoodsWithPatios = useMemo(
    () => new Set(patioNeighborhoods.values()),
    [patioNeighborhoods]
  );

  // Stable time reference for hours filter (only changes per-minute, not per-render)
  const currentMinute = timeState.minuteOfDay;

  // Apply quick filters — remove dots from the map
  const filteredPatios = useMemo(() => {
    const hasHood = quickFilter.neighborhoods.length > 0;
    const hasFood = quickFilter.food !== "all";
    const hasSetting = quickFilter.setting !== "all";
    const hasSun = quickFilter.sunPreference !== "all";
    const hasQuickHours = quickFilter.openOnly;
    const hasLateNight = quickFilter.lateNight;

    if (!hasHood && !hasFood && !hasSetting && !hasSun && !hasQuickHours && !hasLateNight)
      return patiosWithStatus;

    return patiosWithStatus.filter((p) => {
      if (hasHood) {
        const hood = patioNeighborhoods.get(p.id);
        if (!hood || !quickFilter.neighborhoods.includes(hood)) return false;
      }
      if (hasFood) {
        const servesFood = isFood(p.type);
        if (quickFilter.food === "food" && !servesFood) return false;
        if (quickFilter.food === "drinks" && servesFood) return false;
      }
      if (hasSetting) {
        if (quickFilter.setting === "rooftop" && !p.rooftop) return false;
        if (quickFilter.setting === "patio" && p.rooftop) return false;
      }
      if (hasSun) {
        if (quickFilter.sunPreference === "sun" && !p.inSun) return false;
        if (quickFilter.sunPreference === "shade" && p.inSun) return false;
        if (quickFilter.sunPreference === "rooftop" && !p.rooftop) return false;
      }
      if (hasLateNight && !p.lateNight) return false;
      if (hasQuickHours) {
        const open = isOpenAt(p.openingHours, timeState.date);
        if (open === false) return false;
      }
      return true;
    });
    // currentMinute ensures we only recompute when the minute ticks, not on every Date reference
  }, [patiosWithStatus, quickFilter, patioNeighborhoods, currentMinute]);

  const filteredSunCount = useMemo(
    () => filteredPatios.filter((p) => p.inSun).length,
    [filteredPatios]
  );
  const filteredShadeCount = useMemo(
    () => filteredPatios.filter((p) => !p.inSun).length,
    [filteredPatios]
  );

  const selectedHourIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(timeState.date);
    selected.setHours(0, 0, 0, 0);
    const dayOffset = Math.max(0, Math.min(5, Math.round(
      (selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )));
    return dayOffset * 24 + Math.floor(timeState.minuteOfDay / 60);
  }, [timeState.date, timeState.minuteOfDay]);

  const weatherDisplay = useMemo(() => {
    if (!weather) return null;
    const hourly = weather.hourly;
    const hourCode = hourly?.weatherCode?.[selectedHourIndex] ?? weather.current.weatherCode;
    const hourTemp = hourly?.temperature?.[selectedHourIndex] ?? weather.current.temperature;
    const { label, icon } = decodeWeatherCode(hourCode);
    return {
      temperature: Math.round(hourTemp),
      uvIndex: weather.current.uvIndex,
      label,
      icon,
    };
  }, [weather, selectedHourIndex]);

  // Check if today is expected to have little/no sun (avg daytime sun factor < 0.3)
  const isLowSunDay = useMemo(() => {
    if (!weather?.hourly) return false;
    const sunriseH = Math.floor(sunriseMinute / 60);
    const sunsetH = Math.ceil(sunsetMinute / 60);
    let total = 0;
    let count = 0;
    for (let h = sunriseH; h <= sunsetH; h++) {
      total += getHourlySunFactor(weather.hourly, h);
      count++;
    }
    return count > 0 && total / count < 0.3;
  }, [weather, sunriseMinute, sunsetMinute]);

  const handleMapReady = useCallback(
    (map: mapboxgl.Map) => {
      setMap(map);

      // Track bearing for sun indicator
      map.on("rotate", () => setMapBearing(map.getBearing()));

      // Track map interaction for hiding UI elements
      map.on("movestart", () => setMapInteracting(true));
      map.on("moveend", () => setMapInteracting(false));
    },
    [setMap]
  );

  const handleShadeMapReady = useCallback(() => {}, []);


  const handleRecenter = useCallback(() => {
    mapRef.current?.flyTo({
      center: CHICAGO_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: DEFAULT_PITCH,
      bearing: DEFAULT_BEARING,
      duration: 1500,
    });
  }, [mapRef]);

  const handleZoomOut = useCallback(() => {
    setSelectedPatioId(null);
    setDetailPatio(null);
    mapRef.current?.flyTo({
      center: CHICAGO_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: DEFAULT_PITCH,
      bearing: DEFAULT_BEARING,
      duration: 1200,
    });
  }, [mapRef]);

  const handlePatioClick = useCallback((id: string) => {
    setSelectedPatioId(id);
    const patio = patios.find((p) => p.id === id);
    if (patio) flyTo(patio.lng, patio.lat);
  }, [patios, flyTo]);

  const handlePatioSelect = useCallback(
    (id: string, lng: number, lat: number) => {
      setSelectedPatioId(id);
      flyTo(lng, lat);
    },
    [flyTo]
  );

  const handlePatioDetail = useCallback(
    (patio: PatioWithSunStatus) => {
      setSelectedPatioId(patio.id);
      setDetailPatio(patio);
      setSidebarOpen(false);
      // Offset center south so dot appears above the detail panel
      mapRef.current?.flyTo({
        center: [patio.lng, patio.lat - 0.002],
        zoom: 15.5,
        pitch: DEFAULT_PITCH,
        bearing: DEFAULT_BEARING,
        duration: 1200,
      });
    },
    [mapRef]
  );

  const handleOpenDetail = useCallback(
    (id: string) => {
      const patio = filteredPatios.find((p) => p.id === id);
      if (patio) {
        setDetailPatio(patio);
        setSelectedPatioId(id);
        // Nudge map so dot appears above the detail panel
        mapRef.current?.flyTo({
          center: [patio.lng, patio.lat - 0.002],
          duration: 800,
        });
      }
    },
    [filteredPatios, mapRef]
  );

  const handleNeighborhoodFlyTo = useCallback(
    (name: string) => {
      const label = NEIGHBORHOOD_LABELS.find((n) => n.name === name);
      if (!label || !mapRef.current) return;
      mapRef.current.flyTo({
        center: label.coordinates,
        zoom: 14.5,
        pitch: DEFAULT_PITCH,
        bearing: DEFAULT_BEARING,
        duration: 1500,
      });
    },
    [mapRef]
  );

  // Hide toggles & nav buttons when user is interacting with map, sidebar is open, or detail panel is open
  const hideChrome = mapInteracting || sidebarOpen || !!detailPatio || sliderInteracting;

  return (
    <div className="relative w-full h-dvh overflow-hidden" onPointerDown={stopPlay}>
      {/* Map */}
      <MapInstance
        onMapReady={handleMapReady}
        onShadeMapReady={handleShadeMapReady}
        patiosWithStatus={filteredPatios}
        selectedPatioId={selectedPatioId}
        onPatioClick={handlePatioClick}
        onOpenDetail={handleOpenDetail}
        date={timeState.date}
      />

      {/* Sun direction indicator */}
      <SunIndicator date={timeState.date} mapBearing={mapBearing} />

      {/* Invisible overlay to close filters/sidebar when tapping on map */}
      {(filterPanelOpen || sidebarOpen) && (
        <div
          className="absolute inset-0 z-[5]"
          onClick={() => {
            setFilterPanelOpen(false);
            setSidebarOpen(false);
          }}
        />
      )}

      {/* Top-left: Header + Quick Filter */}
      <div className="absolute top-3 left-3 z-10 w-40 sm:w-72">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onTitleClick={() => setAboutOpen(true)}
        />
        <div className="mt-2">
          <QuickFilter
            filters={quickFilter}
            onFiltersChange={setQuickFilter}
            filteredCount={filteredPatios.length}
            totalCount={patiosWithStatus.length}
            neighborhoodsWithPatios={neighborhoodsWithPatios}
            onNeighborhoodFlyTo={handleNeighborhoodFlyTo}
            currentTime={timeState.date}
            isOpen={filterPanelOpen}
            onToggle={() => {
              setFilterPanelOpen((v) => !v);
              setSidebarOpen(false);
            }}
          />
        </div>
        {/* Patio / Rooftop / Neither toggles — hidden during map interaction or popups */}
        {!hideChrome && (
          <div className="glass-panel rounded-full flex p-0.5 gap-0.5 mt-2 w-fit">
            {([
              { value: "patio" as const, emoji: "🕺", label: "Patio" },
              { value: "rooftop" as const, emoji: "🏙️", label: "Roof" },
              { value: "all" as const, emoji: "🤷", label: "Both" },
            ]).map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setQuickFilter((f) => ({
                    ...f,
                    setting: t.value === "all" ? "all" : f.setting === t.value ? "all" : t.value,
                  }));
                  setFilterPanelOpen(false);
                }}
                title={t.label}
                className={`px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-0.5 ${
                  quickFilter.setting === t.value
                    ? "bg-white/[0.18] text-white shadow-[inset_0_0_10px_rgba(245,158,11,0.12)]"
                    : "text-white/50 hover:text-white/75 hover:bg-white/[0.08]"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Top-right: nav buttons + Find a Bar + weather — hidden during map interaction or popups */}
      {!hideChrome && (
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
          <div className="flex gap-1.5 items-center">
            <button
              onClick={() => setSubmitFormOpen(true)}
              className="glass-icon-btn"
              title="Submit a patio"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={handleRecenter}
              className="glass-icon-btn"
              title="Recenter to Old Town / River North"
            >
              <Crosshair className="w-5 h-5" />
            </button>
          </div>
          {selectedPatioId && (
            <button
              onClick={handleZoomOut}
              className="glass-panel flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-medium text-white/75 hover:text-white hover:bg-white/[0.12] transition-all"
              title="Zoom back out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              <span>Zoom out</span>
            </button>
          )}
          {weatherDisplay && (
            <div className="pointer-events-none select-none">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm" style={{ textShadow: "0 1px 12px rgba(0,0,0,0.5), 0 0 3px rgba(0,0,0,0.25)" }}>
                <span className="text-sm sm:text-lg">{weatherDisplay.icon}</span>
                <span className="text-white/50 font-medium">{weatherDisplay.temperature}°F</span>
                <span className="text-white/30 hidden sm:inline">{weatherDisplay.label}</span>
                <span className="text-white/15 hidden sm:inline">|</span>
                <span className="text-white/30">UV {weatherDisplay.uvIndex}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mid-right: Search Bars button — hidden during map interaction or popups */}
      {!hideChrome && (
        <button
          onClick={() => {
            setSidebarOpen(true);
            setFilterPanelOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 glass-panel flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-2xl text-white/90 hover:text-white hover:bg-white/[0.12] transition-all"
          title="Browse all patios"
        >
          <span className="text-2xl">🍺</span>
          <span className="text-xs font-semibold leading-tight">Search</span>
        </button>
      )}

      {/* "No sun today" toast */}
      {isLowSunDay && !noSunDismissed && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 animate-slide-up">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm"
            style={{
              background: "linear-gradient(160deg, rgba(15, 15, 35, 0.5) 0%, rgba(255, 255, 255, 0.06) 100%)",
              backdropFilter: "blur(40px) saturate(200%)",
              WebkitBackdropFilter: "blur(40px) saturate(200%)",
              border: "0.5px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            }}
          >
            <span className="text-lg">☁️</span>
            <span className="text-white/70 font-medium">Limited sun expected today</span>
            <button
              onClick={() => setNoSunDismissed(true)}
              className="ml-1 w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Bottom center: Horizontal Time Slider — hidden when filters or sidebar open */}
      {!filterPanelOpen && !sidebarOpen && (
        <div
          className="absolute bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 w-[80vw] sm:w-[400px] z-10"
          onPointerDown={() => setSliderInteracting(true)}
          onPointerUp={() => setSliderInteracting(false)}
          onPointerCancel={() => setSliderInteracting(false)}
        >
          <TimeSlider
            timeState={timeState}
            sunriseMinute={sunriseMinute}
            sunsetMinute={sunsetMinute}
            onMinuteChange={setMinuteOfDay}
            onTogglePlay={togglePlay}
          />
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        patios={filteredPatios}
        sunCount={filteredSunCount}
        shadeCount={filteredShadeCount}
        selectedPatioId={selectedPatioId}
        onPatioSelect={handlePatioSelect}
        onPatioDetail={handlePatioDetail}
        isOpen={sidebarOpen}
        isLoading={isLoading}
        currentTime={timeState.date}
        minuteOfDay={timeState.minuteOfDay}
        onDateChange={setCalendarDate}
        onTimeChange={setMinuteOfDay}
        hourlyTemperatures={weather?.hourly?.temperature}
      />

      {/* Patio Detail Panel */}
      <PatioDetailPanel
        patio={detailPatio}
        minuteOfDay={timeState.minuteOfDay}
        date={timeState.date}
        buildingIndex={buildingIndex}
        isPlaying={timeState.isPlaying}
        onTimeChange={setMinuteOfDay}
        onTogglePlay={togglePlay}
        onClose={() => setDetailPatio(null)}
      />

      {/* Submit Patio Form */}
      <SubmitPatioForm
        isOpen={submitFormOpen}
        onClose={() => setSubmitFormOpen(false)}
        onSuccess={refreshPatios}
      />

      {/* About popup */}
      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAboutOpen(false)} />
          <div className="glass-panel relative rounded-[24px] p-6 max-w-sm w-full animate-slide-up">
            <button
              onClick={() => setAboutOpen(false)}
              className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Sun className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white/95">Chicago Booze Map</h2>
                <p className="text-xs text-white/40">Patio Sunlight Tracker</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-white/70 leading-relaxed">
              <p>
                Find the perfect patio, rooftop, or bar in Chicago — and know
                exactly when it&apos;ll be sunny or shaded.
              </p>
              <p>
                Drag the time slider to see real-time shadow simulations based on
                building heights and sun position. Filter by neighborhood, vibe,
                or whether you want sun or shade.
              </p>
              <p>
                At night, every spot lights up green — because Chicago&apos;s
                nightlife doesn&apos;t need sunshine.
              </p>
            </div>
            <button
              onClick={() => setAboutOpen(false)}
              className="mt-5 w-full py-2.5 rounded-full bg-white/15 text-sm font-semibold text-white/90 hover:bg-white/25 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <MapProvider>
      <AppContent />
    </MapProvider>
  );
}
