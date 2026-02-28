// Old Town / River North area
export const CHICAGO_CENTER: [number, number] = [-87.6350, 41.9100];
export const CHICAGO_BOUNDS: [[number, number], [number, number]] = [
  [-87.9403, 41.6445],
  [-87.5241, 42.0230],
];

// Tight bounds — west stops at Humboldt Park (~-87.72)
export const CHICAGO_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-87.72, 41.85],
  [-87.58, 41.97],
];

export const CHICAGO_LAT = 41.9100;
export const CHICAGO_LNG = -87.6350;

// Starting view: zoomed-out overhead
export const INITIAL_ZOOM = 12.5;
export const INITIAL_PITCH = 0;
export const INITIAL_BEARING = 0;

// Interactive view: tilted 3D after first click
export const DEFAULT_ZOOM = 15;
export const DEFAULT_PITCH = 60;
export const DEFAULT_BEARING = -17;

// Neighborhood label positions
export const NEIGHBORHOOD_LABELS: {
  name: string;
  coordinates: [number, number];
}[] = [
  { name: "RIVER NORTH", coordinates: [-87.6350, 41.8920] },
  { name: "OLD TOWN", coordinates: [-87.6380, 41.9110] },
  { name: "GOLD COAST", coordinates: [-87.6280, 41.9040] },
  { name: "LINCOLN PARK", coordinates: [-87.6460, 41.9250] },
  { name: "LAKEVIEW", coordinates: [-87.6490, 41.9430] },
  { name: "WRIGLEYVILLE", coordinates: [-87.6560, 41.9480] },
  { name: "WEST LOOP", coordinates: [-87.6590, 41.8840] },
  { name: "WICKER PARK", coordinates: [-87.6770, 41.9090] },
  { name: "BUCKTOWN", coordinates: [-87.6730, 41.9210] },
  { name: "LOGAN SQUARE", coordinates: [-87.6980, 41.9290] },
  { name: "THE LOOP", coordinates: [-87.6290, 41.8790] },
  { name: "SOUTH LOOP", coordinates: [-87.6250, 41.8680] },
  { name: "STREETERVILLE", coordinates: [-87.6190, 41.8920] },
  { name: "HUMBOLDT PARK", coordinates: [-87.7060, 41.9020] },
  { name: "ANDERSONVILLE", coordinates: [-87.6690, 41.9790] },
  { name: "UPTOWN", coordinates: [-87.6590, 41.9660] },
];

export const CHICAGO_PERMITS_URL =
  "https://data.cityofchicago.org/resource/nxj5-ix6z.json";
export const OVERPASS_API_URL =
  "https://overpass-api.de/api/interpreter";

export const CHICAGO_BBOX = {
  south: 41.6445,
  west: -87.9403,
  north: 42.0230,
  east: -87.5241,
};

export const SUNLIT_COLOR = "#FFB800";
export const SHADED_COLOR = "#9CA3AF";
export const SUNLIT_COLOR_PULSE = "#FFD700";

export const TIME_STEP_MINUTES = 60;
export const ANIMATION_INTERVAL_MS = 3000;
