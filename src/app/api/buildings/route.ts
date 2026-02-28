import { NextResponse } from "next/server";
import { OVERPASS_API_URL, CHICAGO_MAX_BOUNDS } from "@/lib/constants";

export interface BuildingData {
  lat: number;
  lng: number;
  height: number;
}

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

// In-memory cache: { data, timestamp }
let cache: { data: BuildingData[]; timestamp: number } | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function estimateHeight(tags: Record<string, string>): number {
  if (tags.height) {
    const h = parseFloat(tags.height);
    if (!isNaN(h)) return h;
  }
  if (tags["building:levels"]) {
    const levels = parseInt(tags["building:levels"], 10);
    if (!isNaN(levels)) return levels * 3.5; // ~3.5m per level
  }
  return 0;
}

async function fetchBuildings(): Promise<BuildingData[]> {
  // Pad CHICAGO_MAX_BOUNDS by ~500m for shadow probes near edges
  const PAD = 0.005; // ~500m in degrees
  const south = CHICAGO_MAX_BOUNDS[0][1] - PAD;
  const west = CHICAGO_MAX_BOUNDS[0][0] - PAD;
  const north = CHICAGO_MAX_BOUNDS[1][1] + PAD;
  const east = CHICAGO_MAX_BOUNDS[1][0] + PAD;
  const bbox = `${south},${west},${north},${east}`;

  const query = `
    [out:json][timeout:60];
    (
      way["building"]["height"](${bbox});
      way["building"]["building:levels"](${bbox});
      relation["building"]["height"](${bbox});
      relation["building"]["building:levels"](${bbox});
    );
    out center;
  `;

  const res = await fetch(OVERPASS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`Overpass API error: ${res.status}`);
  }

  const data = await res.json();
  const elements = data.elements as OverpassElement[];

  return elements
    .filter((el) => el.center && el.tags)
    .map((el) => {
      const height = estimateHeight(el.tags!);
      return {
        lat: el.center!.lat,
        lng: el.center!.lon,
        height,
      };
    })
    .filter((b) => b.height >= 6); // Match existing threshold
}

export async function GET() {
  // Return cached data if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const buildings = await fetchBuildings();
    cache = { data: buildings, timestamp: Date.now() };
    return NextResponse.json(buildings);
  } catch (err) {
    console.error("Failed to fetch buildings:", err);
    // Return stale cache if available
    if (cache) {
      return NextResponse.json(cache.data);
    }
    return NextResponse.json([], { status: 502 });
  }
}
