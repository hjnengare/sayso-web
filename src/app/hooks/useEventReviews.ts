/**
 * Hook to fetch reviews for a specific event by ID.
 * Uses SWR with optimistic update support.
 */

'use client';

import { useEffect } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { swrConfig } from '../lib/swrConfig';
import type { EventReviewWithUser } from '../lib/types/database';
import { getBrowserSupabase } from '../lib/supabase/client';

async function fetchEventReviews([, eventId]: [string, string]): Promise<EventReviewWithUser[]> {
  const response = await fetch(`/api/events/${eventId}/reviews`);

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const reviews = Array.isArray(data?.reviews) ? data.reviews : [];
  // Ensure every review has a user object and a name for rendering safety
  return reviews
    .filter(Boolean)
    .map((r: any) => ({
      ...r,
      user: {
        id: r?.user?.id ?? r?.user_id ?? null,
        name: r?.user?.name ?? r?.user?.display_name ?? r?.user?.username ?? r?.guest_name ?? 'Anonymous',
        username: r?.user?.username ?? null,
        display_name: r?.user?.display_name ?? null,
        email: r?.user?.email ?? null,
        avatar_url: r?.user?.avatar_url ?? null,
      },
    }));
}

export function useEventReviews(eventId: string | null | undefined) {
  const swrKey = eventId ? (['/api/events/reviews', eventId] as [string, string]) : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchEventReviews, {
    ...swrConfig,
    dedupingInterval: 30_000,
  });

  useEffect(() => {
    if (!swrKey) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') mutate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [swrKey, mutate]);

  // Realtime subscription for live review updates on this event
  useEffect(() => {
    if (!eventId) return;
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`event-reviews-${eventId}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_reviews',
        filter: `event_id=eq.${eventId}`,
      }, () => {
        // Refetch to include latest insert/update/delete
        mutate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, mutate]);

  return {
    reviews: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => mutate(),
    mutate,
  };
}

export function invalidateEventReviews(eventId: string) {
  globalMutate(['/api/events/reviews', eventId]);
}
