"use client";

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type mapboxgl from "mapbox-gl";

interface MapContextValue {
  mapRef: React.RefObject<mapboxgl.Map | null>;
  setMap: (map: mapboxgl.Map) => void;
  flyTo: (lng: number, lat: number) => void;
}

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const setMap = useCallback((map: mapboxgl.Map) => {
    mapRef.current = map;
  }, []);

  const flyTo = useCallback((lng: number, lat: number) => {
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: 17,
      pitch: 60,
      duration: 1500,
    });
  }, []);

  return (
    <MapContext.Provider value={{ mapRef, setMap, flyTo }}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error("useMapContext must be used within MapProvider");
  return ctx;
}
