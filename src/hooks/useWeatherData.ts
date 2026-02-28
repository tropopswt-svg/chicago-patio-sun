"use client";

import useSWR from "swr";
import type { WeatherData } from "@/lib/weather-utils";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) return null;
    return res.json() as Promise<WeatherData>;
  });

export function useWeatherData() {
  const { data, isLoading } = useSWR("/api/weather", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30 * 60 * 1000, // 30 minutes
  });

  return {
    weather: data ?? null,
    isLoading,
  };
}
