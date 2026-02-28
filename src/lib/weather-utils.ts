export interface WeatherData {
  current: {
    temperature: number;
    humidity: number;
    cloudCover: number;
    uvIndex: number;
    weatherCode: number;
  };
  hourly: {
    cloudCover: number[];
    cloudCoverLow: number[];
    cloudCoverMid: number[];
    cloudCoverHigh: number[];
    weatherCode: number[];
  };
}

/**
 * Compute sun transmittance from layered cloud cover (each 0–100).
 * Independent-layer attenuation: low clouds block up to 85%, mid 50%, high 15%.
 * Returns a factor from 0 (fully blocked) to 1 (clear sky).
 */
export function getCloudSunFactor(low: number, mid: number, high: number): number {
  const transmittance =
    (1 - (low / 100) * 0.85) *
    (1 - (mid / 100) * 0.5) *
    (1 - (high / 100) * 0.15);
  return Math.max(0, Math.min(1, transmittance));
}

/**
 * Extract layered cloud data for a given hour and return the sun factor.
 * Returns 1.0 (assume clear) if data is missing.
 */
export function getHourlySunFactor(
  hourly: WeatherData["hourly"] | undefined,
  hour: number
): number {
  if (!hourly) return 1.0;
  const idx = Math.max(0, Math.min(hour, hourly.cloudCoverLow.length - 1));
  const low = hourly.cloudCoverLow[idx] ?? 0;
  const mid = hourly.cloudCoverMid[idx] ?? 0;
  const high = hourly.cloudCoverHigh[idx] ?? 0;
  return getCloudSunFactor(low, mid, high);
}

/**
 * Decode WMO weather code to human-readable label + emoji icon.
 * https://open-meteo.com/en/docs — WMO Weather interpretation codes (WW)
 */
export function decodeWeatherCode(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Clear", icon: "☀️" };
  if (code === 1) return { label: "Mostly Clear", icon: "🌤️" };
  if (code === 2) return { label: "Partly Cloudy", icon: "⛅" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if (code >= 45 && code <= 48) return { label: "Foggy", icon: "🌫️" };
  if (code >= 51 && code <= 55) return { label: "Drizzle", icon: "🌦️" };
  if (code >= 56 && code <= 57) return { label: "Freezing Drizzle", icon: "🌧️" };
  if (code >= 61 && code <= 65) return { label: "Rain", icon: "🌧️" };
  if (code >= 66 && code <= 67) return { label: "Freezing Rain", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "Snow", icon: "❄️" };
  if (code >= 80 && code <= 82) return { label: "Showers", icon: "🌧️" };
  if (code >= 85 && code <= 86) return { label: "Snow Showers", icon: "❄️" };
  if (code >= 95 && code <= 99) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "Unknown", icon: "🌡️" };
}
