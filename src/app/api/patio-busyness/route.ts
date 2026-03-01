import { NextRequest, NextResponse } from "next/server";

const BESTTIME_API_KEY = process.env.BESTTIME_API_KEY ?? "";

// 24-hour in-memory cache keyed by patioId
const cache = new Map<
  string,
  { forecast: number[] | null; timestamp: number }
>();
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const name = searchParams.get("name");
  const address = searchParams.get("address");
  const patioId = searchParams.get("patioId");

  if (!name || !address || !patioId) {
    return NextResponse.json(
      { error: "Missing required params: name, address, patioId" },
      { status: 400 }
    );
  }

  if (!BESTTIME_API_KEY) {
    return NextResponse.json({ forecast: null });
  }

  // Check cache
  const cached = cache.get(patioId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json({ forecast: cached.forecast });
  }

  try {
    const res = await fetch("https://besttime.app/api/v1/forecasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key_private: BESTTIME_API_KEY,
        venue_name: name,
        venue_address: address,
      }),
    });

    if (!res.ok) {
      console.error("BestTime API error:", res.status);
      cache.set(patioId, { forecast: null, timestamp: Date.now() });
      return NextResponse.json({ forecast: null });
    }

    const data = await res.json();

    // Extract today's hourly forecast
    const todayIndex = new Date().getDay(); // 0=Sunday
    const todayName = DAY_NAMES[todayIndex];
    const dayAnalysis = data.analysis?.find(
      (d: { day_info?: { day_text?: string } }) =>
        d.day_info?.day_text === todayName
    );

    const forecast: number[] | null = dayAnalysis?.day_raw ?? null;

    cache.set(patioId, { forecast, timestamp: Date.now() });
    return NextResponse.json({ forecast });
  } catch (err) {
    console.error("Failed to fetch busyness data:", err);
    cache.set(patioId, { forecast: null, timestamp: Date.now() });
    return NextResponse.json({ forecast: null });
  }
}
