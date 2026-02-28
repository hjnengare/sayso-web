'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

export type RemindBefore = '1_day' | '2_hours';

export function useEventReminder(
  eventId: string,
  eventTitle: string,
  eventStartISO?: string
) {
  const { user } = useAuth();
  const [activeReminders, setActiveReminders] = useState<RemindBefore[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !eventId) return;
    let cancelled = false;

    fetch(`/api/events-and-specials/${eventId}/reminder`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setActiveReminders((data.reminders ?? []).map((r: any) => r.remind_before));
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [eventId, user]);

  const toggle = useCallback(
    async (remindBefore: RemindBefore): Promise<boolean> => {
      if (!user || loading || !eventStartISO) return false;
      setLoading(true);

      const has = activeReminders.includes(remindBefore);

      try {
        if (has) {
          await fetch(
            `/api/events-and-specials/${eventId}/reminder?remind_before=${remindBefore}`,
            { method: 'DELETE' }
          );
          setActiveReminders((prev) => prev.filter((r) => r !== remindBefore));
        } else {
          const res = await fetch(`/api/events-and-specials/${eventId}/reminder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              remind_before: remindBefore,
              event_title: eventTitle,
              event_start_iso: eventStartISO,
            }),
          });
          if (res.ok) {
            setActiveReminders((prev) => [...prev, remindBefore]);
          } else {
            const data = await res.json();
            throw new Error(data.error || 'Failed to set reminder');
          }
        }
        return !has;
      } finally {
        setLoading(false);
      }
    },
    [activeReminders, eventId, eventStartISO, eventTitle, loading, user]
  );

  const hasReminder = (remindBefore: RemindBefore) => activeReminders.includes(remindBefore);

  return { activeReminders, toggle, hasReminder, loading };
}
