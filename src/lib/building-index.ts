import Flatbush from "flatbush";

export interface Building {
  lat: number;
  lng: number;
  height: number;
}

export interface BuildingIndex {
  buildings: Building[];
  index: Flatbush;
}

const METERS_TO_DEG = 1 / 111320;

/**
 * Build a Flatbush spatial index from building centroids.
 */
export function createBuildingIndex(buildings: Building[]): BuildingIndex {
  const index = new Flatbush(buildings.length);

  for (const b of buildings) {
    // Index each building as a point (minX=maxX, minY=maxY)
    index.add(b.lng, b.lat, b.lng, b.lat);
  }

  index.finish();

  return { buildings, index };
}

/**
 * Query buildings within a radius (in meters) of a point.
 * Returns matching buildings with their distances.
 */
export function queryNear(
  bIdx: BuildingIndex,
  lat: number,
  lng: number,
  radiusMeters: number
): Building[] {
  const latDelta = radiusMeters * METERS_TO_DEG;
  const lngDelta = radiusMeters * METERS_TO_DEG / Math.cos((lat * Math.PI) / 180);

  const ids = bIdx.index.search(
    lng - lngDelta,
    lat - latDelta,
    lng + lngDelta,
    lat + latDelta
  );

  return ids.map((i) => bIdx.buildings[i]);
}
