/**
 * Hook to fetch events & specials for a business from /api/businesses/[id]/events.
 * Uses SWR for caching and deduplication. Shared by BusinessOwnedEventsSection and EventsForm.
 */

'use client';

import useSWR from 'swr';
import { swrConfig } from '../lib/swrConfig';

export interface BusinessEvent {
  id: string;
  title: string;
  type: 'event' | 'special';
  startDate: string;
  endDate?: string;
  location: string;
  description?: string;
  icon?: string;
  price?: number;
  businessId: string;
  bookingUrl?: string;
  bookingContact?: string;
  createdAt?: string;
  image?: string;
}

async function fetchBusinessEvents([, businessId]: [string, string]): Promise<BusinessEvent[]> {
  const res = await fetch(`/api/businesses/${businessId}/events`);
  if (!res.ok) throw new Error('Failed to fetch events');
  const result = await res.json();
  return result.data ?? [];
}

export function useBusinessEvents(businessId: string | null | undefined) {
  const swrKey = businessId ? ([`/api/businesses/events`, businessId] as [string, string]) : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchBusinessEvents, {
    ...swrConfig,
    dedupingInterval: 30_000,
  });

  return {
    events: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => mutate(),
    mutate,
  };
}
