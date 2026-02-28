'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

const STORAGE_PREFIX = 'sayso_rsvp_';

export function useEventRsvp(eventId: string) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [isGoing, setIsGoing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;

    fetch(`/api/events-and-specials/${eventId}/rsvp`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setCount(data.count ?? 0);
        if (user) {
          setIsGoing(data.userRsvpd ?? false);
        } else {
          setIsGoing(localStorage.getItem(`${STORAGE_PREFIX}${eventId}`) === 'true');
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [eventId, user]);

  const toggle = useCallback(async () => {
    if (loading) return;

    if (user) {
      // Auth user — DB toggle
      setLoading(true);
      try {
        const res = await fetch(`/api/events-and-specials/${eventId}/rsvp`, { method: 'POST' });
        const data = await res.json();
        setCount(data.count ?? 0);
        setIsGoing(data.isGoing ?? false);
      } finally {
        setLoading(false);
      }
    } else {
      // Guest — localStorage only, optimistic
      const next = !isGoing;
      setIsGoing(next);
      setCount((c) => Math.max(0, next ? c + 1 : c - 1));
      if (next) localStorage.setItem(`${STORAGE_PREFIX}${eventId}`, 'true');
      else localStorage.removeItem(`${STORAGE_PREFIX}${eventId}`);
    }
  }, [eventId, isGoing, loading, user]);

  return { count, isGoing, toggle, loading };
}
