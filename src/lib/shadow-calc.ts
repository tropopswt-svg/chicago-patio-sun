import { queryNear, type BuildingIndex } from "./building-index";

const METERS_TO_LAT = 1 / 111320;

/** Search radius around each probe point (meters). */
const BUILDING_MATCH_RADIUS = 40;

/** Max angle (radians) between sun azimuth and building direction to count as blocking.
 *  ~25° — tight enough to avoid false positives from side buildings. */
const MAX_ANGLE_OFF_SUN = Math.PI / 7;

/**
 * Geometric shadow calculator — uses static building index (no map/viewport dependency).
 *
 * From the patio, steps toward the sun in real-world meters.
 * At each step, queries the spatial index for nearby buildings.
 * Only counts buildings that are actually in the sun's direction from the patio.
 * If a building is tall enough for its shadow to reach the patio → shaded.
 */
export function isPatioInShadow(
  buildingIndex: BuildingIndex,
  patioLng: number,
  patioLat: number,
  sunAzimuthDeg: number,
  sunAltitudeDeg: number
): { inShadow: boolean; blockedByBuilding: boolean } {
  if (sunAltitudeDeg <= 1) return { inShadow: true, blockedByBuilding: false };

  const altRad = (sunAltitudeDeg * Math.PI) / 180;
  // Azimuth: 0 = north, 90 = east — direction toward the sun
  const azRad = (sunAzimuthDeg * Math.PI) / 180;

  const metersToLng = METERS_TO_LAT / Math.cos((patioLat * Math.PI) / 180);

  // Unit vector toward the sun in geographic coords (per meter)
  const dLng = Math.sin(azRad) * metersToLng;
  const dLat = Math.cos(azRad) * METERS_TO_LAT;

  // Probe at real-world distances (meters) toward the sun
  const probeMeters = [15, 30, 50, 80, 120, 180, 260];

  for (const meters of probeMeters) {
    // Geographic point toward the sun
    const probeLng = patioLng + dLng * meters;
    const probeLat = patioLat + dLat * meters;

    // Query spatial index for buildings near this probe point
    const nearby = queryNear(buildingIndex, probeLat, probeLng, BUILDING_MATCH_RADIUS);

    for (const b of nearby) {
      if (b.height < 6) continue;

      // Direction from patio to building (in meters)
      const bDLngM = (b.lng - patioLng) / metersToLng;
      const bDLatM = (b.lat - patioLat) / METERS_TO_LAT;

      // Skip buildings too close to the patio itself (likely the patio's own building)
      const actualDist = Math.sqrt(bDLngM * bDLngM + bDLatM * bDLatM);
      if (actualDist < 8) continue;

      // Check building is actually in the sun's direction from the patio
      const bAzRad = Math.atan2(bDLngM, bDLatM);
      let angleDiff = Math.abs(bAzRad - azRad);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
      if (angleDiff > MAX_ANGLE_OFF_SUN) continue;

      // Shadow length = height / tan(altitude)
      const shadowLength = b.height / Math.tan(altRad);

      // Use actual distance from patio to building, not probe distance
      if (actualDist < shadowLength) {
        return { inShadow: true, blockedByBuilding: true };
      }
    }
  }

  return { inShadow: false, blockedByBuilding: false };
}

/**
 * Batch-classify patios for sun/shade using static building data.
 * Deterministic — same inputs always produce same output regardless of zoom/viewport.
 */
export function classifyPatiosShadow(
  buildingIndex: BuildingIndex,
  patios: { id: string; lat: number; lng: number }[],
  sunAzimuthDeg: number,
  sunAltitudeDeg: number
): Map<string, { inSun: boolean; blockedByBuilding: boolean }> {
  const result = new Map<string, { inSun: boolean; blockedByBuilding: boolean }>();

  if (sunAltitudeDeg <= 1) {
    for (const p of patios) result.set(p.id, { inSun: false, blockedByBuilding: false });
    return result;
  }

  if (sunAltitudeDeg > 70) {
    for (const p of patios) result.set(p.id, { inSun: true, blockedByBuilding: false });
    return result;
  }

  for (const p of patios) {
    const { inShadow, blockedByBuilding } = isPatioInShadow(
      buildingIndex, p.lng, p.lat,
      sunAzimuthDeg, sunAltitudeDeg
    );
    result.set(p.id, { inSun: !inShadow, blockedByBuilding });
  }

  return result;
}
