"use client";

import useSWR from "swr";

interface PatioPhotoResponse {
  photoUrl: string | null;
  hours: string | null;
  isOpen: boolean | null;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => res.json() as Promise<PatioPhotoResponse>);

export function usePatioPhoto(
  patio: { id: string; name: string; lat: number; lng: number } | null,
  enabled: boolean
) {
  const key =
    enabled && patio
      ? `/api/patio-photo?name=${encodeURIComponent(patio.name)}&lat=${patio.lat}&lng=${patio.lng}&patioId=${patio.id}`
      : null;

  const { data, isLoading } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 24 * 60 * 60 * 1000,
  });

  return {
    photoUrl: data?.photoUrl ?? null,
    hours: data?.hours ?? null,
    isOpen: data?.isOpen ?? null,
    isLoading: enabled && isLoading,
  };
}
