import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";

// 24-hour in-memory cache (keyed by patioId)
const cache = new Map<
  string,
  {
    photoDataUri: string | null;
    hours: string | null;
    isOpen: boolean | null;
    timestamp: number;
  }
>();
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Spending cap: $0.032 per Text Search request, $30 max = 937 requests
const COST_PER_REQUEST = 0.032;
const MAX_SPEND = 30;
const MAX_REQUESTS = Math.floor(MAX_SPEND / COST_PER_REQUEST);
let apiRequestCount = 0;

function formatHoursForToday(
  openingHours: {
    periods?: { open?: { day: number; hour: number; minute: number }; close?: { day: number; hour: number; minute: number } }[];
    openNow?: boolean;
  } | undefined
): { hours: string | null; isOpen: boolean | null } {
  if (!openingHours) return { hours: null, isOpen: null };

  const isOpen = openingHours.openNow ?? null;
  const today = new Date().getDay(); // 0=Sunday

  const todayPeriod = openingHours.periods?.find((p) => p.open?.day === today);
  if (!todayPeriod?.open) return { hours: null, isOpen };

  const formatTime = (h: number, m: number) => {
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${hour} ${ampm}` : `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const openTime = formatTime(todayPeriod.open.hour, todayPeriod.open.minute);
  const closeTime = todayPeriod.close
    ? formatTime(todayPeriod.close.hour, todayPeriod.close.minute)
    : "Late";

  return { hours: `${openTime} \u2013 ${closeTime}`, isOpen };
}

async function fetchPhotoAsDataUri(photoRef: string): Promise<string | null> {
  try {
    const url = `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=96&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Google photo fetch error:", res.status);
      return null;
    }
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const name = searchParams.get("name");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const patioId = searchParams.get("patioId");

  if (!name || !lat || !lng || !patioId) {
    return NextResponse.json(
      { error: "Missing required params: name, lat, lng, patioId" },
      { status: 400 }
    );
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ photoUrl: null, hours: null, isOpen: null });
  }

  // Check cache
  const cached = cache.get(patioId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json({
      photoUrl: cached.photoDataUri,
      hours: cached.hours,
      isOpen: cached.isOpen,
    });
  }

  // Enforce spending cap
  if (apiRequestCount >= MAX_REQUESTS) {
    console.warn(`Spending cap reached: ${apiRequestCount} requests (~$${(apiRequestCount * COST_PER_REQUEST).toFixed(2)})`);
    return NextResponse.json({ photoUrl: null, hours: null, isOpen: null });
  }

  try {
    apiRequestCount++;
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY,
          "X-Goog-FieldMask":
            "places.photos,places.currentOpeningHours",
        },
        body: JSON.stringify({
          textQuery: name,
          locationBias: {
            circle: {
              center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
              radius: 200,
            },
          },
          maxResultCount: 1,
        }),
      }
    );

    if (!res.ok) {
      console.error("Google Places API error:", res.status);
      const result = { photoDataUri: null, hours: null, isOpen: null, timestamp: Date.now() };
      cache.set(patioId, result);
      return NextResponse.json({ photoUrl: null, hours: null, isOpen: null });
    }

    const data = await res.json();
    const place = data.places?.[0];
    const photoRef = place?.photos?.[0]?.name;
    const { hours, isOpen } = formatHoursForToday(place?.currentOpeningHours);

    // Fetch photo bytes server-side and convert to base64 data URI
    const photoDataUri = photoRef ? await fetchPhotoAsDataUri(photoRef) : null;

    cache.set(patioId, { photoDataUri, hours, isOpen, timestamp: Date.now() });
    return NextResponse.json({ photoUrl: photoDataUri, hours, isOpen });
  } catch (err) {
    console.error("Failed to fetch patio photo:", err);
    const result = { photoDataUri: null, hours: null, isOpen: null, timestamp: Date.now() };
    cache.set(patioId, result);
    return NextResponse.json({ photoUrl: null, hours: null, isOpen: null });
  }
}
