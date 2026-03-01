import SunCalc from "suncalc";
import { CHICAGO_LAT, CHICAGO_LNG } from "./constants";
import type { SunPosition } from "./types";

const CHICAGO_TZ = "America/Chicago";

// Cache the formatter — creating it is expensive, calling formatToParts is cheap
const chicagoTimeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: CHICAGO_TZ,
  hour: "numeric",
  minute: "numeric",
  hour12: false,
});

/** Get minute-of-day (0–1439) in Chicago time from any Date */
export function chicagoMinuteOfDay(date: Date): number {
  const parts = chicagoTimeFmt.formatToParts(date);
  const h = parseInt(parts.find((p) => p.type === "hour")!.value);
  const m = parseInt(parts.find((p) => p.type === "minute")!.value);
  // hour12:false returns "24" for midnight in some browsers
  return (h === 24 ? 0 : h) * 60 + m;
}

export function getSunPosition(date: Date): SunPosition {
  const pos = SunCalc.getPosition(date, CHICAGO_LAT, CHICAGO_LNG);
  return {
    azimuth: pos.azimuth,
    altitude: pos.altitude,
    azimuthDegrees: (pos.azimuth * 180) / Math.PI + 180,
    altitudeDegrees: (pos.altitude * 180) / Math.PI,
  };
}

export function getSunTimes(date: Date) {
  return SunCalc.getTimes(date, CHICAGO_LAT, CHICAGO_LNG);
}

export function isSunUp(date: Date): boolean {
  const pos = SunCalc.getPosition(date, CHICAGO_LAT, CHICAGO_LNG);
  return pos.altitude > 0;
}

export function getSunriseMinute(date: Date): number {
  const times = getSunTimes(date);
  return chicagoMinuteOfDay(times.sunrise);
}

export function getSunsetMinute(date: Date): number {
  const times = getSunTimes(date);
  return chicagoMinuteOfDay(times.sunset);
}

export function getGoldenHourTimes(date: Date) {
  const times = getSunTimes(date);
  return {
    morningStart: times.sunrise,
    morningEnd: times.goldenHourEnd,
    eveningStart: times.goldenHour,
    eveningEnd: times.sunset,
  };
}

/**
 * Convert SunCalc position to Mapbox directional light direction.
 * SunCalc: azimuth 0 = south, clockwise, radians
 * Mapbox: azimuth 0 = north, clockwise, degrees; altitude in degrees
 */
export function getMapboxLightDirection(date: Date): [number, number] {
  const pos = SunCalc.getPosition(date, CHICAGO_LAT, CHICAGO_LNG);
  const azimuthDeg = ((pos.azimuth * 180) / Math.PI + 180) % 360;
  const altitudeDeg = Math.max(0, (pos.altitude * 180) / Math.PI);
  return [azimuthDeg, altitudeDeg];
}

/**
 * Convert SunCalc position to Mapbox sky atmosphere sun position.
 * sky-atmosphere-sun: [azimuth, polar angle from zenith] in degrees
 */
export function getMapboxSkyPosition(date: Date): [number, number] {
  const pos = SunCalc.getPosition(date, CHICAGO_LAT, CHICAGO_LNG);
  const azimuthDeg = ((pos.azimuth * 180) / Math.PI + 180) % 360;
  const polarDeg = 90 - (pos.altitude * 180) / Math.PI;
  return [azimuthDeg, Math.max(0, Math.min(180, polarDeg))];
}

/**
 * Get sun color temperature — warm at low angles, white at high
 */
export function getSunColor(date: Date): string {
  const pos = SunCalc.getPosition(date, CHICAGO_LAT, CHICAGO_LNG);
  const altDeg = (pos.altitude * 180) / Math.PI;
  if (altDeg < 0) return "#1a1a3e";
  if (altDeg < 6) return "#ff6b35";   // deep golden hour
  if (altDeg < 12) return "#ffa040";  // golden hour
  if (altDeg < 25) return "#ffc850";  // warm
  return "#ffe8b0";                    // midday warm white
}

/**
 * Get sun intensity based on altitude
 */
export function getSunIntensity(date: Date): number {
  const pos = SunCalc.getPosition(date, CHICAGO_LAT, CHICAGO_LNG);
  const altDeg = (pos.altitude * 180) / Math.PI;
  if (altDeg < 0) return 0;
  if (altDeg < 10) return 0.3;
  if (altDeg < 30) return 0.5;
  return 0.6;
}

/**
 * Returns a descriptive tag explaining why a patio is in sun or shade.
 * Optional cloudSunFactor (0–1) adjusts tags for cloud cover.
 */
export function getSunTag(
  inSun: boolean,
  blockedByBuilding: boolean,
  altitudeDegrees: number,
  date: Date,
  cloudSunFactor?: number
): string {
  if (!isSunUp(date)) return "🌙 After Sunset";

  // Cloud-aware tags when factor is provided
  if (cloudSunFactor !== undefined && cloudSunFactor < 0.8) {
    if (cloudSunFactor < 0.2) {
      return blockedByBuilding ? "☁️ Overcast & Shaded" : "☁️ Overcast";
    }
    if (cloudSunFactor < 0.5) return "🌥️ Mostly Cloudy";
    return "⛅ Filtered Sun";
  }

  if (inSun) {
    if (altitudeDegrees > 25) return "☀️ Direct Sunlight";
    if (altitudeDegrees > 12) return "☀️ Afternoon Sun";
    if (altitudeDegrees >= 1) return "🌅 Golden Hour";
  }

  // In shade
  if (blockedByBuilding && altitudeDegrees > 1) return "🏢 Blocked by Building";
  if (altitudeDegrees <= 6) return "🌅 Sun Too Low";
  return "🏢 Blocked by Building";
}

export function formatMinuteOfDay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}
