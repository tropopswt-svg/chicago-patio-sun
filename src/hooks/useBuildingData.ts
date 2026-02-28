"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { createBuildingIndex, type Building, type BuildingIndex } from "@/lib/building-index";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useBuildingData() {
  const { data, error, isLoading } = useSWR<Building[]>("/api/buildings", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 24 * 60 * 60 * 1000, // 24h
  });

  const buildingIndex = useMemo<BuildingIndex | null>(() => {
    if (!data || data.length === 0) return null;
    return createBuildingIndex(data);
  }, [data]);

  return {
    buildingIndex,
    buildingCount: data?.length ?? 0,
    error,
    isLoading,
  };
}
