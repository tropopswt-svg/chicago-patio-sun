import { OVERPASS_API_URL, CHICAGO_BBOX } from "./constants";
import type { Patio } from "./types";

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export async function fetchOSMPatios(): Promise<Patio[]> {
  const { south, west, north, east } = CHICAGO_BBOX;
  const bbox = `${south},${west},${north},${east}`;

  const query = `
    [out:json][timeout:30];
    (
      node["outdoor_seating"="yes"]["amenity"~"restaurant|bar|cafe|pub"](${bbox});
      way["outdoor_seating"="yes"]["amenity"~"restaurant|bar|cafe|pub"](${bbox});
    );
    out center;
  `;

  const res = await fetch(OVERPASS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) return [];

  const data = await res.json();

  return (data.elements as OverpassElement[])
    .filter((el) => el.lat || el.center)
    .map((el) => {
      const lat = el.lat ?? el.center!.lat;
      const lng = el.lon ?? el.center!.lon;
      return {
        id: `osm-${el.id}`,
        name: el.tags?.name || "Unnamed Venue",
        address: [el.tags?.["addr:housenumber"], el.tags?.["addr:street"]]
          .filter(Boolean)
          .join(" ") || "",
        lat,
        lng,
        source: "osm" as const,
        type: el.tags?.amenity || "restaurant",
        openingHours: el.tags?.opening_hours || undefined,
      };
    });
}
