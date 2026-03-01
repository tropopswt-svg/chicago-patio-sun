"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  CHICAGO_CENTER,
  CHICAGO_MAX_BOUNDS,
  INITIAL_ZOOM,
  INITIAL_PITCH,
  INITIAL_BEARING,
  DEFAULT_ZOOM,
  DEFAULT_PITCH,
  DEFAULT_BEARING,
  NEIGHBORHOOD_LABELS,
  SUNLIT_COLOR,
  SHADED_COLOR,
} from "@/lib/constants";
import {
  getMapboxSkyPosition,
  getSunColor,
  getSunIntensity,
  isSunUp,
  getSunPosition,
} from "@/lib/suncalc-utils";
import type { PatioWithSunStatus } from "@/lib/types";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";


interface MapInstanceProps {
  onMapReady: (map: mapboxgl.Map) => void;
  onShadeMapReady: (shadeMap: unknown) => void;
  patiosWithStatus: PatioWithSunStatus[];
  selectedPatioId: string | null;
  onPatioClick: (id: string) => void;
  onOpenDetail: (id: string) => void;
  date: Date;
}

let useLightsAPI = true; // try v3 setLights first, fall back to setLight

function updateSunLighting(map: mapboxgl.Map, date: Date) {
  try {
    const sunUp = isSunUp(date);
    const sunColor = getSunColor(date);
    const intensity = getSunIntensity(date);
    const { azimuthDegrees, altitudeDegrees } = getSunPosition(date);

    if (useLightsAPI) {
      try {
        // Mapbox GL v3 setLights — enables real ground shadows from buildings
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map as any).setLights([
          {
            id: "sun",
            type: "directional",
            properties: {
              direction: [azimuthDegrees, sunUp ? Math.max(5, altitudeDegrees) : 80],
              color: sunUp ? sunColor : "#222244",
              intensity: sunUp ? intensity : 0.05,
              "cast-shadows": true,
              "shadow-intensity": sunUp ? 1.0 : 0,
            },
          },
          {
            id: "ambient",
            type: "ambient",
            properties: {
              color: sunUp ? "#8090b0" : "#252550",
              intensity: sunUp ? 0.1 : 0.25,
            },
          },
        ]);
      } catch {
        // v3 setLights not available, fall back permanently
        useLightsAPI = false;
        map.setLight({
          anchor: "map",
          color: sunUp ? sunColor : "#222244",
          intensity: sunUp ? intensity : 0.15,
          position: [1.5, azimuthDegrees, sunUp ? Math.max(10, 90 - altitudeDegrees) : 80],
        });
      }
    } else {
      map.setLight({
        anchor: "map",
        color: sunUp ? sunColor : "#111133",
        intensity: sunUp ? intensity : 0.1,
        position: [1.5, azimuthDegrees, sunUp ? Math.max(10, 90 - altitudeDegrees) : 80],
      });
    }

    // Update sky if present
    if (map.getLayer("sky-layer")) {
      const [skyAz, skyPolar] = getMapboxSkyPosition(date);
      map.setPaintProperty("sky-layer", "sky-atmosphere-sun", [skyAz, skyPolar]);
      map.setPaintProperty(
        "sky-layer",
        "sky-atmosphere-sun-intensity",
        sunUp ? (altitudeDegrees < 15 ? 8 : 5) : 0
      );
    }

    // Atmospheric fog
    if (sunUp && altitudeDegrees < 15) {
      map.setFog({
        color: "rgb(60, 40, 20)",
        "high-color": "rgb(50, 30, 50)",
        "horizon-blend": 0.08,
        "space-color": "rgb(20, 15, 30)",
        "star-intensity": 0,
      });
    } else if (sunUp) {
      map.setFog({
        color: "rgb(30, 30, 50)",
        "high-color": "rgb(40, 40, 70)",
        "horizon-blend": 0.06,
        "space-color": "rgb(15, 15, 30)",
        "star-intensity": 0,
      });
    } else {
      map.setFog({
        color: "rgb(18, 18, 38)",
        "high-color": "rgb(25, 25, 50)",
        "horizon-blend": 0.1,
        "space-color": "rgb(12, 12, 28)",
        "star-intensity": 0.35,
      });
    }
  } catch (err) {
    console.warn("Sun lighting update failed:", err);
  }
}

export default function MapInstance({
  onMapReady,
  onShadeMapReady,
  patiosWithStatus,
  selectedPatioId,
  onPatioClick,
  onOpenDetail,
  date,
}: MapInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const shadeMapRef = useRef<unknown>(null);
  const shadeMapLayerIdsRef = useRef<string[]>([]);
  const shadeMapClassRef = useRef<unknown>(null);
  const wasNightRef = useRef<boolean | null>(null);
  const shadeMapCreatingRef = useRef(false);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const hasZoomedIn = useRef(false);
  const clickCount = useRef(0);
  const onOpenDetailRef = useRef(onOpenDetail);
  onOpenDetailRef.current = onOpenDetail;
  const lastDataKeyRef = useRef("");
  const lastLightMinuteRef = useRef(-1);

  const updatePatioLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("patios")) return;

    // Build a fingerprint so we skip setData when nothing changed
    const key = patiosWithStatus.map((p) =>
      `${p.id}:${p.inSun ? 1 : 0}:${p.id === selectedPatioId ? 1 : 0}`
    ).join("|");

    if (key === lastDataKeyRef.current) return;
    lastDataKeyRef.current = key;

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: patiosWithStatus.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          name: p.name,
          address: p.address,
          inSun: p.inSun,
          sunTag: p.sunTag || "",
          selected: p.id === selectedPatioId,
          rooftop: p.rooftop || false,
        },
      })),
    };

    (map.getSource("patios") as mapboxgl.GeoJSONSource).setData(geojson);
  }, [patiosWithStatus, selectedPatioId]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: CHICAGO_CENTER,
      zoom: INITIAL_ZOOM,
      pitch: INITIAL_PITCH,
      bearing: INITIAL_BEARING,
      antialias: typeof window !== 'undefined' && window.innerWidth >= 640,
      fadeDuration: 0,
      maxBounds: CHICAGO_MAX_BOUNDS,
      minZoom: 11.5,
      maxZoom: 20,
    });

    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    // First 3 clicks: zoom in progressively, then switch to 3D tilted view
    const handleZoomClick = (e: mapboxgl.MapMouseEvent) => {
      clickCount.current++;
      const count = clickCount.current;

      if (count === 1) {
        map.flyTo({
          center: e.lngLat,
          zoom: 13.5,
          pitch: 0,
          bearing: 0,
          duration: 1200,
        });
      } else if (count === 2) {
        map.flyTo({
          center: e.lngLat,
          zoom: 14.5,
          pitch: 20,
          bearing: DEFAULT_BEARING,
          duration: 1200,
        });
      } else if (count === 3) {
        hasZoomedIn.current = true;
        map.off("click", handleZoomClick);
        map.flyTo({
          center: e.lngLat,
          zoom: DEFAULT_ZOOM,
          pitch: DEFAULT_PITCH,
          bearing: DEFAULT_BEARING,
          duration: 2000,
        });
      }
    };
    map.on("click", handleZoomClick);

    map.on("load", () => {
      // ── Hide street labels until zoomed in ──
      const style = map.getStyle();
      for (const layer of style.layers || []) {
        if (layer.type === "symbol") {
          if (layer.id.match(/road-label|street-label|road-number/)) {
            map.setLayerZoomRange(layer.id, 15, 24);
          } else if (
            layer.id.match(/poi-label|transit-label|airport-label|natural-point-label|waterway-label/)
          ) {
            map.setLayoutProperty(layer.id, "visibility", "none");
          }
        }
      }

      // ── Neighborhood labels ──
      map.addSource("neighborhoods", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: NEIGHBORHOOD_LABELS.map((n) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: n.coordinates },
            properties: { name: n.name },
          })),
        },
      });

      map.addLayer({
        id: "neighborhood-labels",
        type: "symbol",
        source: "neighborhoods",
        layout: {
          "text-field": ["get", "name"],
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            11.5, 14, 13, 18, 15, 14, 17, 0,
          ],
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          "text-letter-spacing": 0.15,
          "text-allow-overlap": false,
          "text-padding": 8,
        },
        paint: {
          "text-color": "rgba(255, 255, 255, 0.95)",
          "text-halo-color": "rgba(0, 0, 0, 0.9)",
          "text-halo-width": 2.5,
          "text-halo-blur": 0.5,
        },
      });

      // ── 3D Buildings ──
      // Find insert position (below first label layer)
      const allLayers = map.getStyle().layers || [];
      const labelLayer = allLayers.find(
        (l) => l.type === "symbol" && l.layout?.["text-field"]
      )?.id;

      // Add our 3D building layer (the style may or may not have one already,
      // but adding a second fill-extrusion on the same source-layer is fine —
      // ours will render on top with correct heights)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 12,
          paint: {
            "fill-extrusion-color": [
              "interpolate", ["linear"], ["get", "height"],
              0, "#8899aa",
              50, "#99aabb",
              150, "#aabbcc",
              300, "#bbccdd",
            ],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.9,
            "fill-extrusion-ambient-occlusion-intensity": 0.75,
            "fill-extrusion-ambient-occlusion-radius": 5,
          } as any,
        },
        labelLayer
      );

      // ── Sky layer ──
      try {
        const [skyAz, skyPolar] = getMapboxSkyPosition(date);
        map.addLayer({
          id: "sky-layer",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [skyAz, skyPolar],
            "sky-atmosphere-sun-intensity": 5,
          },
        });
      } catch (err) {
        console.warn("Sky layer failed:", err);
      }

      // ── Sun lighting ──
      updateSunLighting(map, date);

      // ── Patio layers ──
      map.addSource("patios", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Sun glow (soft outer ring on sunlit patios — daytime only)
      map.addLayer({
        id: "patios-sun-glow",
        type: "circle",
        source: "patios",
        filter: ["==", ["get", "inSun"], true],
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            11.5, 6, 13, 10, 16, 18, 20, 30,
          ],
          "circle-color": "#FFB800",
          "circle-opacity": 0.2,
          "circle-blur": 1,
        },
      });

      // Base patio layer — ALWAYS renders every patio (no filter)
      // Colors are switched between night/day via setPaintProperty in the date effect
      map.addLayer({
        id: "patios-base",
        type: "circle",
        source: "patios",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            11.5, 3.5, 13, 5, 16, 9, 20, 14,
          ],
          "circle-color": SHADED_COLOR,
          "circle-opacity": 0.85,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#333",
        },
      });

      // Selected glow ring (outer) — yellow when in sun, subtle white when in shade
      map.addLayer({
        id: "patios-selected-glow",
        type: "circle",
        source: "patios",
        filter: ["==", ["get", "selected"], true],
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            12, 18, 16, 28, 20, 36,
          ],
          "circle-color": [
            "case", ["==", ["get", "inSun"], true],
            "rgba(255, 184, 0, 0.25)",
            "rgba(255, 255, 255, 0.08)",
          ],
          "circle-blur": 1,
          "circle-stroke-width": 0,
        },
      });

      // Selected ring (inner) — filled yellow in sun, empty with white ring in shade
      map.addLayer({
        id: "patios-selected",
        type: "circle",
        source: "patios",
        filter: ["==", ["get", "selected"], true],
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            12, 8, 16, 14, 20, 20,
          ],
          "circle-color": [
            "case", ["==", ["get", "inSun"], true],
            "#FFB800",
            "transparent",
          ],
          "circle-opacity": 1.0,
          "circle-stroke-width": 3,
          "circle-stroke-color": [
            "case", ["==", ["get", "inSun"], true],
            "#FFD700",
            "#ffffff",
          ],
        },
      });

      // Move neighborhood labels above patio dots
      map.moveLayer("neighborhood-labels");

      // ── Click handlers ──
      map.on("click", "patios-base", (e) => {
        hasZoomedIn.current = true;
        map.off("click", handleZoomClick);

        const feature = e.features?.[0];
        if (feature?.properties?.id) {
          onPatioClick(feature.properties.id);
          showPopup(map, e.lngLat, feature.properties);
        }
      });
      map.on("dblclick", "patios-base", (e) => {
        e.preventDefault();
        const feature = e.features?.[0];
        if (feature?.properties?.id) {
          onOpenDetailRef.current(feature.properties.id);
        }
      });
      map.on("mouseenter", "patios-base", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "patios-base", () => {
        map.getCanvas().style.cursor = "";
      });

      // ── Auto pitch based on zoom ──
      // Zoom out → flatten to overhead; Zoom in → tilt to 3D
      map.on("zoomend", () => {
        const zoom = map.getZoom();
        const pitch = map.getPitch();

        // Mark as zoomed in once user reaches 14.5+ (via pinch, scroll, or clicks)
        if (zoom >= 14.5) hasZoomedIn.current = true;

        if (zoom < 13.5 && pitch > 5) {
          map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
        } else if (zoom >= 14.5 && pitch < 10 && hasZoomedIn.current) {
          map.easeTo({ pitch: DEFAULT_PITCH, bearing: DEFAULT_BEARING, duration: 800 });
        }
      });

      mapRef.current = map;
      onMapReady(map);

      // Load ShadeMap
      loadShadeMap(map);
    });

    map.on("error", (e) => {
      console.error("Mapbox error:", e.error);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close popup when patio is deselected
  useEffect(() => {
    if (!selectedPatioId) {
      popupRef.current?.remove();
    }
  }, [selectedPatioId]);

  // Dim the map and non-selected dots when a patio is selected (detail open)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Add or update a dark overlay layer to shade the whole map
    if (!map.getSource("dim-overlay-src")) {
      map.addSource("dim-overlay-src", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [[[-180,-90],[180,-90],[180,90],[-180,90],[-180,-90]]] },
          properties: {},
        },
      });
      map.addLayer({
        id: "dim-overlay",
        type: "fill",
        source: "dim-overlay-src",
        paint: {
          "fill-color": "#000000",
          "fill-opacity": 0,
        },
      });
    }

    if (selectedPatioId) {
      // Darken the map
      map.setPaintProperty("dim-overlay", "fill-opacity", 0.4);
      // Dim non-selected patio dots
      if (map.getLayer("patios-base")) {
        map.setPaintProperty("patios-base", "circle-opacity", [
          "case", ["==", ["get", "selected"], true], 1.0, 0.2,
        ]);
        map.setPaintProperty("patios-base", "circle-stroke-opacity", [
          "case", ["==", ["get", "selected"], true], 1.0, 0.2,
        ]);
      }
      if (map.getLayer("patios-sun-glow")) {
        map.setPaintProperty("patios-sun-glow", "circle-opacity", 0.05);
      }
    } else {
      // Restore
      map.setPaintProperty("dim-overlay", "fill-opacity", 0);
      if (map.getLayer("patios-base")) {
        map.setPaintProperty("patios-base", "circle-stroke-opacity", 1.0);
      }
      if (map.getLayer("patios-sun-glow")) {
        map.setPaintProperty("patios-sun-glow", "circle-opacity", 0.2);
      }
    }
  }, [selectedPatioId]);

  // Update patio layer data
  useEffect(() => {
    updatePatioLayers();
  }, [updatePatioLayers]);

  // Update sun lighting, dot colors, and ShadeMap when time changes
  // Dedup at minute level so rapid slider drags don't trigger redundant GPU work
  const currentMinute = date.getHours() * 60 + date.getMinutes();
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return; // Don't consume the minute — retry when map is ready

    if (currentMinute === lastLightMinuteRef.current) return;
    lastLightMinuteRef.current = currentMinute;

    updateSunLighting(map, date);

    const night = !isSunUp(date);

    // Switch dot colors between night (solid green) and day (data-driven sun/shade)
    if (map.getLayer("patios-base")) {
      if (night) {
        map.setPaintProperty("patios-base", "circle-color", "#22c55e");
        map.setPaintProperty("patios-base", "circle-stroke-color", "#16a34a");
        map.setPaintProperty("patios-base", "circle-opacity", 1.0);
        // Boost dot size at night for visibility
        map.setPaintProperty("patios-base", "circle-radius", [
          "interpolate", ["linear"], ["zoom"],
          11.5, 4.5, 13, 6, 16, 10, 20, 15,
        ]);
      } else {
        map.setPaintProperty("patios-base", "circle-color", [
          "case", ["==", ["get", "inSun"], true], SUNLIT_COLOR, SHADED_COLOR,
        ]);
        map.setPaintProperty("patios-base", "circle-stroke-color", [
          "case", ["==", ["get", "inSun"], true], "#FFD700", "#333",
        ]);
        map.setPaintProperty("patios-base", "circle-opacity", [
          "case", ["==", ["get", "inSun"], true], 1.0, 0.85,
        ]);
        // Restore normal dot size
        map.setPaintProperty("patios-base", "circle-radius", [
          "interpolate", ["linear"], ["zoom"],
          11.5, 3.5, 13, 5, 16, 9, 20, 14,
        ]);
      }
    }

    // Hide sun glow at night
    if (map.getLayer("patios-sun-glow")) {
      map.setLayoutProperty(
        "patios-sun-glow",
        "visibility",
        night ? "none" : "visible"
      );
    }

    // Day→Night: fully destroy ShadeMap (custom WebGL layers ignore visibility controls)
    if (night && wasNightRef.current === false) {
      // Remove custom layers from Mapbox first (stops render loop calls)
      for (const id of shadeMapLayerIdsRef.current) {
        try { if (map.getLayer(id)) map.removeLayer(id); } catch { /* noop */ }
      }
      shadeMapLayerIdsRef.current = [];
      // Null out ref — do NOT call sm.remove() as it double-frees WebGL textures
      shadeMapRef.current = null;
    }

    // Night→Day: recreate ShadeMap from cached class
    if (!night && wasNightRef.current === true && shadeMapClassRef.current && !shadeMapCreatingRef.current) {
      shadeMapCreatingRef.current = true;
      try { createShadeMapInstance(map, date); } catch { /* noop */ }
      shadeMapCreatingRef.current = false;
    }

    // Daytime: update ShadeMap date
    if (!night) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sm = shadeMapRef.current as any;
      if (sm?.setDate) {
        try { sm.setDate(date); } catch { /* noop */ }
      }
    }

    wasNightRef.current = night;

    // Always keep patio layers on top
    if (map.getLayer("dim-overlay")) map.moveLayer("dim-overlay");
    if (map.getLayer("patios-sun-glow")) map.moveLayer("patios-sun-glow");
    if (map.getLayer("patios-base")) map.moveLayer("patios-base");
    if (map.getLayer("patios-selected-glow")) map.moveLayer("patios-selected-glow");
    if (map.getLayer("patios-selected")) map.moveLayer("patios-selected");
    if (map.getLayer("neighborhood-labels")) map.moveLayer("neighborhood-labels");
  }, [currentMinute, date]);

  // Create a fresh ShadeMap instance and add it to the map (synchronous addTo)
  function createShadeMapInstance(map: mapboxgl.Map, d: Date) {
    try {
    const apiKey = process.env.NEXT_PUBLIC_SHADEMAP_KEY;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SMClass = shadeMapClassRef.current as any;
    if (!apiKey || !SMClass) return;

    const sm = new SMClass({
      date: d,
      color: "#000a1a",
      opacity: 0.7,
      apiKey,
      terrainSource: {
        maxZoom: 15,
        tileSize: 256,
        getSourceUrl: ({ x, y, z }: { x: number; y: number; z: number }) =>
          `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
        getElevation: ({ r, g, b }: { r: number; g: number; b: number }) =>
          (r * 256 + g + b / 256) - 32768,
      },
      getFeatures: async () => {
        await map.once("idle");
        try {
          return map.queryRenderedFeatures({ layers: ["3d-buildings"] });
        } catch {
          return [];
        }
      },
    });

    shadeMapRef.current = sm;

    // Detect which layers ShadeMap adds so we can clean them up later
    const layersBefore = new Set((map.getStyle()?.layers || []).map((l) => l.id));
    sm.addTo(map);
    const layersAfter = (map.getStyle()?.layers || []).map((l) => l.id);
    shadeMapLayerIdsRef.current = layersAfter.filter((id) => !layersBefore.has(id));

    // Keep patio layers above ShadeMap
    if (map.getLayer("dim-overlay")) map.moveLayer("dim-overlay");
    if (map.getLayer("patios-sun-glow")) map.moveLayer("patios-sun-glow");
    if (map.getLayer("patios-base")) map.moveLayer("patios-base");
    if (map.getLayer("patios-selected-glow")) map.moveLayer("patios-selected-glow");
    if (map.getLayer("patios-selected")) map.moveLayer("patios-selected");
    if (map.getLayer("neighborhood-labels")) map.moveLayer("neighborhood-labels");

    onShadeMapReady(sm);
    } catch (err) {
      console.warn("ShadeMap creation failed:", err);
    }
  }

  async function loadShadeMap(map: mapboxgl.Map) {
    try {
      const apiKey = process.env.NEXT_PUBLIC_SHADEMAP_KEY;
      if (!apiKey) return;

      await map.once("idle");

      const ShadeMap = (await import("mapbox-gl-shadow-simulator")).default;
      shadeMapClassRef.current = ShadeMap;

      const night = !isSunUp(date);
      wasNightRef.current = night;

      // At night, don't add ShadeMap at all — it will be created on night→day transition
      if (night) return;

      createShadeMapInstance(map, date);
    } catch (err) {
      console.warn("ShadeMap failed to load:", err);
    }
  }

  function showPopup(
    map: mapboxgl.Map,
    lngLat: mapboxgl.LngLat,
    props: Record<string, unknown>
  ) {
    popupRef.current?.remove();

    const inSun = props.inSun;
    const statusIcon = inSun ? "\u2600\uFE0F" : "\uD83C\uDF25\uFE0F";
    const statusText = inSun ? "In Sun" : "In Shade";
    const statusClass = inSun ? "sun" : "shade";
    const sunTag = props.sunTag ? String(props.sunTag) : "";
    const isRooftop = props.rooftop === true || props.rooftop === "true";
    const photoId = `popup-photo-${props.id}`;
    const hoursId = `popup-hours-${props.id}`;
    const busynessId = `popup-busyness-${props.id}`;
    const detailsBtnId = `popup-details-${props.id}`;

    popupRef.current = new mapboxgl.Popup({
      closeButton: true,
      maxWidth: "280px",
      className: "patio-popup",
    })
      .setLngLat(lngLat)
      .setHTML(
        `<div class="popup-content">
          <div id="${photoId}" class="popup-photo-container"></div>
          <h3>${props.name}</h3>
          ${props.address ? `<p class="popup-address">${props.address}</p>` : ""}
          <div class="popup-badges">
            <span class="popup-status ${statusClass}">${statusIcon} ${statusText}</span>
            ${isRooftop ? '<span class="popup-rooftop">Rooftop</span>' : ""}
            <span id="${hoursId}"></span>
            <span id="${busynessId}"></span>
          </div>
          ${sunTag ? `<span class="popup-sun-tag">${sunTag}</span>` : ""}
          <button id="${detailsBtnId}" class="popup-details-btn">Details</button>
        </div>`
      )
      .addTo(map);

    // Attach Details button listener
    const detailsBtn = document.getElementById(detailsBtnId);
    if (detailsBtn) {
      detailsBtn.addEventListener("click", () => {
        onOpenDetailRef.current(String(props.id));
        popupRef.current?.remove();
      });
    }

    // Fetch and inject photo + hours
    const params = new URLSearchParams({
      name: String(props.name),
      lat: String(lngLat.lat),
      lng: String(lngLat.lng),
      patioId: String(props.id),
    });
    fetch(`/api/patio-photo?${params}`)
      .then((res) => res.json())
      .then((data: { photoUrl: string | null; hours: string | null; isOpen: boolean | null }) => {
        const photoContainer = document.getElementById(photoId);
        if (photoContainer && data.photoUrl) {
          const img = document.createElement("img");
          img.src = data.photoUrl;
          img.alt = String(props.name);
          img.className = "popup-photo";
          img.onerror = () => img.remove();
          photoContainer.appendChild(img);
        }

        const hoursEl = document.getElementById(hoursId);
        if (hoursEl && data.hours) {
          const openClass = data.isOpen ? "popup-hours-open" : "popup-hours-closed";
          const label = data.isOpen ? `Open \u00B7 ${data.hours}` : `Closed \u00B7 ${data.hours}`;
          hoursEl.className = openClass;
          hoursEl.textContent = label;
        }
      })
      .catch(() => {});

    // Fetch and inject busyness badge
    const busynessParams = new URLSearchParams({
      name: String(props.name),
      address: String(props.address || ""),
      patioId: String(props.id),
    });
    fetch(`/api/patio-busyness?${busynessParams}`)
      .then((res) => res.json())
      .then((data: { forecast: number[] | null }) => {
        const el = document.getElementById(busynessId);
        if (!el || !data.forecast) return;
        const hour = Math.floor(date.getHours() + date.getMinutes() / 60);
        const value = data.forecast[hour];
        if (value == null) return;
        let label: string;
        let cls: string;
        if (value > 70) {
          label = "Busy";
          cls = "popup-busyness-busy";
        } else if (value >= 40) {
          label = "Moderate";
          cls = "popup-busyness-moderate";
        } else {
          label = "Quiet";
          cls = "popup-busyness-quiet";
        }
        el.className = cls;
        el.textContent = label;
      })
      .catch(() => {});
  }

  return (
    <div ref={containerRef} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} />
  );
}
