/**
 * Hook to reverse-geocode a lat/lng pair via POST /api/geocode/reverse.
 * Uses SWR with a stable key derived from the coordinates.
 */

'use client';

import useSWR from 'swr';
import { swrConfig } from '../lib/swrConfig';

async function fetchReverseGeocode([, lat, lng]: [string, number, number]): Promise<string | null> {
  const res = await fetch('/api/geocode/reverse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data.success && data.address ? (data.address as string) : null;
}

export function useReverseGeocode(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  enabled = true,
) {
  // Round to 6 decimal places for cache key stability
  const lat = latitude != null ? Math.round(latitude * 1e6) / 1e6 : null;
  const lng = longitude != null ? Math.round(longitude * 1e6) / 1e6 : null;

  const swrKey =
    enabled && lat != null && lng != null
      ? (['/api/geocode/reverse', lat, lng] as [string, number, number])
      : null;

  const { data, isLoading } = useSWR(swrKey, fetchReverseGeocode, {
    ...swrConfig,
    dedupingInterval: 60_000 * 30, // 30-minute cache for coordinates
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return {
    address: data ?? null,
    isLoading,
  };
}
