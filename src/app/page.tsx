"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Crosshair, Plus, ZoomOut } from "lucide-react";
import type mapboxgl from "mapbox-gl";

import { MapProvider, useMapContext } from "@/components/providers/MapProvider";
import { Header } from "@/components/ui/Header";
import { TimeSlider } from "@/components/ui/TimeSlider";
import { Legend } from "@/components/ui/Legend";
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
import { decodeWeatherCode } from "@/lib/weather-utils";
import { CHICAGO_CENTER, DEFAULT_ZOOM, DEFAULT_PITCH, DEFAULT_BEARING, NEIGHBORHOOD_LABELS } from "@/lib/constants";
import { getNeighborhood, isFood } from "@/lib/neighborhoods";
import { isOpenAt } from "@/lib/hours";
import type { LegendWeather } from "@/components/ui/Legend";
import type { QuickFilterState, PatioWithSunStatus } from "@/lib/types";
import type { HoursFilter } from "@/components/ui/Sidebar";

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
  const [hoursFilter, setHoursFilter] = useState<HoursFilter>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilterState>({
    neighborhoods: [],
    food: "all",
    setting: "all",
    sunPreference: "all",
    openOnly: false,
    lateNight: false,
  });

  const { timeState, sunriseMinute, sunsetMinute, setMinuteOfDay, togglePlay } =
    useTimeControl();
  const { patios, isLoading, refreshPatios } = usePatioData();
  const { buildingIndex } = useBuildingData();
  const { weather } = useWeatherData();
  const { patiosWithStatus, sunCount, shadeCount, classifyPatios } =
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

  // Apply quick filters + sidebar hours filter — both remove dots from the map
  const filteredPatios = useMemo(() => {
    const hasHood = quickFilter.neighborhoods.length > 0;
    const hasFood = quickFilter.food !== "all";
    const hasSetting = quickFilter.setting !== "all";
    const hasSun = quickFilter.sunPreference !== "all";
    const hasQuickHours = quickFilter.openOnly;
    const hasSidebarHours = hoursFilter !== "all";
    const hasLateNight = quickFilter.lateNight;

    if (!hasHood && !hasFood && !hasSetting && !hasSun && !hasQuickHours && !hasSidebarHours && !hasLateNight)
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
      // Hours filtering from either quick filter or sidebar toggle
      if (hasQuickHours || hasSidebarHours) {
        const open = isOpenAt(p.openingHours, timeState.date);
        if (hasQuickHours && open === false) return false;
        if (hasSidebarHours) {
          if (hoursFilter === "open" && open === false) return false;
          if (hoursFilter === "closed" && open !== false) return false;
        }
      }
      return true;
    });
  }, [patiosWithStatus, quickFilter, hoursFilter, patioNeighborhoods, timeState.date]);

  const legendWeather = useMemo((): LegendWeather | null => {
    if (!weather) return null;
    const { label, icon } = decodeWeatherCode(weather.current.weatherCode);
    return {
      temperature: weather.current.temperature,
      uvIndex: weather.current.uvIndex,
      conditionLabel: label,
      conditionIcon: icon,
    };
  }, [weather]);

  const filteredSunCount = useMemo(
    () => filteredPatios.filter((p) => p.inSun).length,
    [filteredPatios]
  );
  const filteredShadeCount = useMemo(
    () => filteredPatios.filter((p) => !p.inSun).length,
    [filteredPatios]
  );

  const handleMapReady = useCallback(
    (map: mapboxgl.Map) => {
      setMap(map);

      // Track bearing for sun indicator
      map.on("rotate", () => setMapBearing(map.getBearing()));
    },
    [setMap]
  );

  const handleShadeMapReady = useCallback(() => {}, []);

  // Reclassify when patios data, building data, or time changes
  useEffect(() => {
    if (patios.length > 0 && buildingIndex) {
      classifyPatios();
    }
  }, [patios, buildingIndex, classifyPatios]);

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
      flyTo(patio.lng, patio.lat);
    },
    [flyTo]
  );

  const handleOpenDetail = useCallback(
    (id: string) => {
      const patio = filteredPatios.find((p) => p.id === id);
      if (patio) {
        setDetailPatio(patio);
        setSelectedPatioId(id);
      }
    },
    [filteredPatios]
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

  return (
    <div className="relative w-screen h-screen overflow-hidden">
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

      {/* Top-left: Header + Quick Filter */}
      <div className="absolute top-4 left-4 z-10 w-64 sm:w-72">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
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
          />
        </div>
      </div>

      {/* Top-right buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setSubmitFormOpen(true)}
          className="glass-panel w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Submit a patio"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={handleRecenter}
          className="glass-panel w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Recenter to Old Town / River North"
        >
          <Crosshair className="w-5 h-5" />
        </button>
      </div>

      {/* Zoom-out button — appears after clicking into a patio */}
      {selectedPatioId && (
        <button
          onClick={handleZoomOut}
          className="absolute top-16 right-4 z-10 glass-panel flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Zoom back out"
        >
          <ZoomOut className="w-4 h-4" />
          <span className="hidden sm:inline">Zoom out</span>
        </button>
      )}

      {/* Bottom-left: Legend */}
      <div className="absolute bottom-24 left-4 z-10">
        <Legend sunCount={filteredSunCount} shadeCount={filteredShadeCount} weather={legendWeather} />
      </div>

      {/* Patio / Rooftop toggle */}
      <div className="absolute bottom-[108px] left-1/2 -translate-x-1/2 sm:left-4 sm:translate-x-0 z-10">
        <div className="glass-panel rounded-full flex p-1 gap-1">
          <button
            onClick={() =>
              setQuickFilter((f) => ({
                ...f,
                setting: f.setting === "patio" ? "all" : "patio",
              }))
            }
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              quickFilter.setting === "patio"
                ? "bg-amber-500/30 text-amber-300"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            🕺 Patio
          </button>
          <button
            onClick={() =>
              setQuickFilter((f) => ({
                ...f,
                setting: f.setting === "rooftop" ? "all" : "rooftop",
              }))
            }
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              quickFilter.setting === "rooftop"
                ? "bg-amber-500/30 text-amber-300"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            🏙️ Rooftop
          </button>
        </div>
      </div>

      {/* Bottom: Time Slider */}
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-[480px] z-10">
        <TimeSlider
          timeState={timeState}
          sunriseMinute={sunriseMinute}
          sunsetMinute={sunsetMinute}
          onMinuteChange={setMinuteOfDay}
          onTogglePlay={togglePlay}
        />
      </div>

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
        hoursFilter={hoursFilter}
        onHoursFilterChange={setHoursFilter}
      />

      {/* Patio Detail Panel */}
      <PatioDetailPanel
        patio={detailPatio}
        minuteOfDay={timeState.minuteOfDay}
        onClose={() => setDetailPatio(null)}
      />

      {/* Submit Patio Form */}
      <SubmitPatioForm
        isOpen={submitFormOpen}
        onClose={() => setSubmitFormOpen(false)}
        onSuccess={refreshPatios}
      />
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
