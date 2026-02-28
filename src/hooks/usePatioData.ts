"use client";

import useSWR from "swr";
import type { Patio } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePatioData() {
  const { data, error, isLoading, mutate } = useSWR<Patio[]>("/api/patios", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60 * 60 * 1000,
  });

  return {
    patios: data ?? [],
    error,
    isLoading,
    refreshPatios: () => mutate(),
  };
}
