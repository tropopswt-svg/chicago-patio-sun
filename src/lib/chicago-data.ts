import { CHICAGO_PERMITS_URL } from "./constants";
import type { Patio } from "./types";

interface PermitRecord {
  doing_business_as_name?: string;
  legal_name?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  account_number?: string;
}

export async function fetchChicagoPermits(): Promise<Patio[]> {
  const url = `${CHICAGO_PERMITS_URL}?$limit=5000&$where=latitude IS NOT NULL`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data: PermitRecord[] = await res.json();

  const seen = new Set<string>();

  return data
    .filter((r) => r.latitude && r.longitude)
    .filter((r) => {
      const key = r.account_number || `${r.latitude}-${r.longitude}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((r, i) => ({
      id: `chi-${r.account_number || i}-${r.latitude}-${r.longitude}`,
      name: r.doing_business_as_name || r.legal_name || "Unknown Venue",
      address: r.address || "",
      lat: parseFloat(r.latitude!),
      lng: parseFloat(r.longitude!),
      source: "chicago-permits" as const,
      type: "sidewalk-cafe",
    }));
}
