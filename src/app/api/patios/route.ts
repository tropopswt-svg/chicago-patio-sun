import { NextResponse } from "next/server";
import { fetchChicagoPermits } from "@/lib/chicago-data";
import { fetchOSMPatios } from "@/lib/overpass";
import { CURATED_PATIOS } from "@/lib/curated-patios";
import { loadUserSubmissions } from "@/lib/user-submissions";
import type { Patio } from "@/lib/types";

let cache: { data: Patio[]; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Exact brand/chain names to exclude (substring match)
const EXCLUDED_NAMES = [
  // Coffee / tea chains
  "starbucks",
  "dunkin",
  "peet's",
  "caribou",
  "intelligentsia",
  "philz",
  // Fast food / fast casual chains
  "panera",
  "mcdonald",
  "subway",
  "chipotle",
  "sweetgreen",
  "insomnia cookie",
  "crumbl",
  "jamba",
  "eataly",
  "arby's",
  "five guys",
  "jimmy john",
  "johnny rockets",
  "tgi friday",
  "quiznos",
  "quizno's",
  "shake shack",
  "panda express",
  "popeyes",
  "potbelly",
  "taco bell",
  "chick-fil-a",
  "nando's peri",
  "hooters",
  "cold stone",
  "dairy queen",
  "portillo",
  "bennigan",
  "buffalo wings",
  "au bon pain",
  "einstein bros",
  "qdoba",
  "raising cane",
  "dog haus",
  "buona",
  "blaze pizza",
  "wingstop",
  // Retail / non-food
  "ralph lauren",
  "borders books",
  "jewel food",
  "hershey",
  "space519",
];

// Regex patterns with word boundaries for category filtering
const EXCLUDED_PATTERNS = [
  /\bcoffee\b/,
  /\bespresso\b/,
  /\bcaf[eé]\b/,
  /\btea\b/,
  /\bjuice\b/,
  /\bsmoothie\b/,
  /\bbake/,          // catches "baker", "bakery", "bake shop"
  /\bice\s*cream/,
  /\bfrozen\s*yogurt/,
  /\byogurt\b/,
  /\bdoughnut/,
  /\bdonut/,
  // Sweets / desserts
  /\bgelato\b/,
  /\bchocolate/,
  /\bcandy/,
  /\bconfection/,
  /\bcupcake/,
  /\bitalian\s+ice\b/,
  /\bfrozen\s+dessert/,
  /\bsweets\b/,
  /\bcreamery/,
  // Grocery / markets / retail
  /\bgrocery/,
  /\bfood\s+mart/,
  /\bfood\s+market/,
  /\bfood\s+store/,
  // Non-food venues
  /\bcinema\b/,
  /\btheatre\b/,
  /\btheater\b/,
  /\bbilliard/,
];

function isBarOrRestaurant(patio: Patio): boolean {
  const name = patio.name.toLowerCase();

  // Check exact name substrings
  if (EXCLUDED_NAMES.some((kw) => name.includes(kw))) return false;

  // Check regex patterns
  if (EXCLUDED_PATTERNS.some((re) => re.test(name))) return false;

  // OSM cafes without "bar" or "pub" type are likely coffee shops
  if (patio.source === "osm" && patio.type === "cafe") return false;

  return true;
}

const SOURCE_PRIORITY: Record<string, number> = {
  curated: 4,
  "chicago-permits": 3,
  osm: 2,
  "user-submitted": 1,
};

function deduplicatePatios(patios: Patio[]): Patio[] {
  const seen = new Map<string, Patio>();

  for (const patio of patios) {
    // Create a rough location key (round to ~50m)
    const latKey = Math.round(patio.lat * 1000) / 1000;
    const lngKey = Math.round(patio.lng * 1000) / 1000;
    const key = `${latKey},${lngKey}`;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, patio);
    } else {
      const existingPri = SOURCE_PRIORITY[existing.source] ?? 0;
      const newPri = SOURCE_PRIORITY[patio.source] ?? 0;
      if (newPri > existingPri) {
        // Keep openingHours from the lower-priority record if the winner lacks them
        if (!patio.openingHours && existing.openingHours) {
          patio.openingHours = existing.openingHours;
        }
        seen.set(key, patio);
      } else if (!existing.openingHours && patio.openingHours) {
        // Merge hours from lower-priority duplicate into the winner
        existing.openingHours = patio.openingHours;
      }
    }
  }

  return Array.from(seen.values());
}

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return NextResponse.json(cache.data);
  }

  const [permits, osm] = await Promise.allSettled([
    fetchChicagoPermits(),
    fetchOSMPatios(),
  ]);

  const userSubmissions = loadUserSubmissions();

  const apiPatios: Patio[] = [
    ...(permits.status === "fulfilled" ? permits.value : []),
    ...(osm.status === "fulfilled" ? osm.value : []),
  ];

  // Filter to Chicago proper and exclude non-alcohol venues
  // Only apply isBarOrRestaurant to API-sourced data (permits + osm)
  const chicagoApiPatios = apiPatios
    .filter(
      (p) =>
        p.lat >= 41.64 && p.lat <= 42.03 && p.lng >= -87.94 && p.lng <= -87.52
    )
    .filter(isBarOrRestaurant);

  // Curated and user-submitted bypass keyword filtering (user-verified)
  const allPatios = [
    ...CURATED_PATIOS,
    ...chicagoApiPatios,
    ...userSubmissions,
  ];

  const deduplicated = deduplicatePatios(allPatios);

  cache = { data: deduplicated, timestamp: Date.now() };

  return NextResponse.json(deduplicated);
}
