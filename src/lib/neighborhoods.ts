import { NEIGHBORHOOD_LABELS } from "./constants";

/**
 * Returns the closest neighborhood label name for a given lat/lng.
 * Uses simple squared-distance — accurate enough for nearby labels.
 */
export function getNeighborhood(lat: number, lng: number): string {
  let closest = NEIGHBORHOOD_LABELS[0].name;
  let minDist = Infinity;

  for (const label of NEIGHBORHOOD_LABELS) {
    const dlat = lat - label.coordinates[1];
    const dlng = lng - label.coordinates[0];
    const dist = dlat * dlat + dlng * dlng;
    if (dist < minDist) {
      minDist = dist;
      closest = label.name;
    }
  }

  return closest;
}

/**
 * Returns true if the venue type serves food.
 * Bars and pubs are drinks-only; restaurants, cafes, and sidewalk cafes serve food.
 */
export function isFood(type?: string): boolean {
  switch (type) {
    case "bar":
    case "pub":
      return false;
    case "restaurant":
    case "cafe":
    case "sidewalk-cafe":
    default:
      return true;
  }
}
