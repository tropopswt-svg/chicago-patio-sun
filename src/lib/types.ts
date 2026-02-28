export interface Patio {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  source: "chicago-permits" | "osm" | "curated" | "user-submitted";
  type?: string;
  rooftop?: boolean;
  openingHours?: string;
  lateNight?: boolean;
}

export interface PatioWithSunStatus extends Patio {
  inSun: boolean;
  sunTag?: string;
}

export type SunFilter = "all" | "sun" | "shade" | "rooftop";

export type FoodFilter = "all" | "food" | "drinks";
export type SettingFilter = "all" | "patio" | "rooftop";

export interface QuickFilterState {
  neighborhoods: string[];
  food: FoodFilter;
  setting: SettingFilter;
  sunPreference: SunFilter;
  openOnly: boolean;
  lateNight: boolean;
}

export interface PatioSubmission {
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: "bar" | "restaurant" | "pub" | "rooftop";
  submittedAt: string;
}

export interface SunPosition {
  azimuth: number;
  altitude: number;
  azimuthDegrees: number;
  altitudeDegrees: number;
}

export interface TimeState {
  date: Date;
  minuteOfDay: number;
  isPlaying: boolean;
  isNight: boolean;
}
