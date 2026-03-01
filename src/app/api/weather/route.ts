import { NextResponse } from "next/server";
import type { WeatherData } from "@/lib/weather-utils";

// In-memory cache: { data, timestamp }
let cache: { data: WeatherData; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast?" +
  "latitude=41.91&longitude=-87.635" +
  "&current=temperature_2m,relative_humidity_2m,cloud_cover,uv_index,weather_code" +
  "&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,weather_code,temperature_2m" +
  "&temperature_unit=fahrenheit&timezone=America/Chicago&forecast_days=6";

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    cloud_cover: number;
    uv_index: number;
    weather_code: number;
  };
  hourly: {
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    weather_code: number[];
    temperature_2m: number[];
  };
}

function normalize(raw: OpenMeteoResponse): WeatherData {
  return {
    current: {
      temperature: raw.current.temperature_2m,
      humidity: raw.current.relative_humidity_2m,
      cloudCover: raw.current.cloud_cover,
      uvIndex: raw.current.uv_index,
      weatherCode: raw.current.weather_code,
    },
    hourly: {
      cloudCover: raw.hourly.cloud_cover,
      cloudCoverLow: raw.hourly.cloud_cover_low,
      cloudCoverMid: raw.hourly.cloud_cover_mid,
      cloudCoverHigh: raw.hourly.cloud_cover_high,
      weatherCode: raw.hourly.weather_code,
      temperature: raw.hourly.temperature_2m,
    },
  };
}

export async function GET() {
  // Return cached data if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const res = await fetch(OPEN_METEO_URL);
    if (!res.ok) {
      throw new Error(`Open-Meteo API error: ${res.status}`);
    }
    const raw: OpenMeteoResponse = await res.json();
    const data = normalize(raw);
    cache = { data, timestamp: Date.now() };
    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to fetch weather:", err);
    // Return stale cache if available
    if (cache) {
      return NextResponse.json(cache.data);
    }
    return NextResponse.json(null, { status: 502 });
  }
}
