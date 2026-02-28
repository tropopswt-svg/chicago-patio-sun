"use client";

import useSWR from "swr";

interface PatioBusynessResponse {
  forecast: number[] | null;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => res.json() as Promise<PatioBusynessResponse>);

export function usePatioBusyness(
  patio: { id: string; name: string; address: string } | null,
  enabled: boolean
) {
  const key =
    enabled && patio
      ? `/api/patio-busyness?name=${encodeURIComponent(patio.name)}&address=${encodeURIComponent(patio.address)}&patioId=${patio.id}`
      : null;

  const { data, isLoading } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 24 * 60 * 60 * 1000,
  });

  return {
    forecast: data?.forecast ?? null,
    isLoading: enabled && isLoading,
  };
}

export function getBusynessLevel(forecast: number[] | null, minuteOfDay: number) {
  if (!forecast) return null;
  const hour = Math.floor(minuteOfDay / 60);
  const value = forecast[hour];
  if (value == null) return null;
  if (value > 70) return { label: "Busy", value };
  if (value >= 40) return { label: "Moderate", value };
  return { label: "Quiet", value };
}
