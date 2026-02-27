"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { useAuth } from "./AuthContext";
import { formatTimeAgo } from "../utils/formatTimeAgo";
import { getBrowserSupabase } from "../lib/supabase/client";
import { swrConfig } from "../lib/swrConfig";
import { fireBadgeCelebration } from "../lib/celebration/badgeCelebration";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'review'
  | 'business'
  | 'user'
  | 'highlyRated'
  | 'message'
  | 'otp_sent'
  | 'otp_verified'
  | 'claim_status_changed'
  | 'docs_requested'
  | 'docs_received'
  | 'gamification'
  | 'badge_earned'
  | 'review_helpful'
  | 'business_approved'
  | 'claim_approved'
  | 'comment_reply'
  | 'photo_approved'
  | 'milestone_achievement';

export interface ToastNotificationData {
  id: string;
  type: NotificationType;
  message: string;
  title: string;
  timeAgo: string;
  image: string;
  imageAlt: string;
  link?: string;
  /** Optional badge metadata for badge_earned notifications */
  badge_id?: string;
  badge_name?: string;
}

interface DatabaseNotification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  title: string;
  image: string | null;
  image_alt: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
  updated_at: string;
}

interface NotificationsContextType {
  notifications: ToastNotificationData[];
  toastQueue: ToastNotificationData[];
  dismissToast: (id: string) => void;
  unreadCount: number;
  isLoading: boolean;
  readNotifications: Set<string>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  refetch: () => Promise<void>;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const PERSONAL_NOTIFICATIONS_ENDPOINT = '/api/notifications/user';

async function fetchNotificationsFromApi(url: string): Promise<DatabaseNotification[]> {
  const res = await fetch(url);
  if (!res.ok) {
    const err: any = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return data.notifications ?? [];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toToast(db: DatabaseNotification): ToastNotificationData {
  return {
    id: db.id,
    type: db.type as NotificationType,
    message: db.message,
    title: db.title,
    timeAgo: formatTimeAgo(db.created_at),
    image: db.image || '/png/restaurants.png',
    imageAlt: db.image_alt || 'Notification',
    link: db.link || undefined,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const userCurrentRole =
    user?.profile?.account_role || user?.profile?.role || "user";
  const isAdminUser = userCurrentRole === "admin";
  const isBusinessAccountUser =
    !isAdminUser && userCurrentRole === "business_owner";
  const userId = user?.id ?? null;
  const endpoint = PERSONAL_NOTIFICATIONS_ENDPOINT;

  // Personal notifications endpoint should not be queried by business accounts.
  const shouldFetchPersonalNotifications =
    !authLoading && Boolean(userId) && !isBusinessAccountUser;
  const swrKey = shouldFetchPersonalNotifications ? `${endpoint}:${userId}` : null;

  // realtime is working → no need for aggressive polling; fall back to 30 s if channel fails
  const [realtimeFailed, setRealtimeFailed] = useState(false);

  const { data: rawNotifications, isLoading: swrLoading, mutate } = useSWR<DatabaseNotification[]>(
    swrKey,
    // key is a composite string — pass the actual URL to the fetcher
    () => fetchNotificationsFromApi(endpoint),
    {
      ...swrConfig,
      dedupingInterval: 10_000,
      // Only poll when realtime is down
      refreshInterval: realtimeFailed ? 30_000 : 0,
      // Suppress 401/403 errors (auth transitions) — treat as empty
      onError: (err) => {
        if (err?.status === 401 || err?.status === 403) return;
        console.error('[Notifications] SWR fetch error:', err);
      },
      shouldRetryOnError: (err) => err?.status !== 401 && err?.status !== 403,
    }
  );

  // Derive notifications + read set from SWR data
  const notifications = useMemo<ToastNotificationData[]>(
    () => (rawNotifications ?? []).map(toToast),
    [rawNotifications]
  );

  const readNotifications = useMemo<Set<string>>(
    () => new Set((rawNotifications ?? []).filter(n => n.read).map(n => n.id)),
    [rawNotifications]
  );

  const isLoading = authLoading || (swrKey !== null && swrLoading);

  // ── Toast queue (realtime-only — not persisted in SWR cache) ────────────────
  const [toastQueue, setToastQueue] = useState<ToastNotificationData[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToastQueue(prev => prev.filter(n => n.id !== id));
  }, []);

  // ── Realtime subscription ────────────────────────────────────────────────────
  const supabaseRef = useRef(getBrowserSupabase());

  useEffect(() => {
    if (authLoading || !userId || isBusinessAccountUser) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`notifications-user-${userId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const newRow = payload.new as DatabaseNotification;
        // Optimistically prepend to SWR cache
        mutate(prev => [newRow, ...(prev ?? [])], { revalidate: false });
        // Show as toast
        setToastQueue(prev => [...prev, toToast(newRow)]);
        // Fire badge celebration for badge_earned notifications
        if (newRow.type === 'badge_earned') {
          void fireBadgeCelebration(`realtime-badge-${newRow.id}`);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const updated = payload.new as DatabaseNotification;
        mutate(prev => (prev ?? []).map(n => n.id === updated.id ? updated : n), { revalidate: false });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const deletedId = (payload.old as DatabaseNotification).id;
        mutate(prev => (prev ?? []).filter(n => n.id !== deletedId), { revalidate: false });
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeFailed(false);
          console.log('✅ [Notifications] Realtime subscribed');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Notifications] Realtime failed, falling back to SWR polling', err);
          setRealtimeFailed(true);
          void mutate(); // immediate refetch
        } else if (status === 'CLOSED') {
          setRealtimeFailed(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isBusinessAccountUser, authLoading, mutate]);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update in SWR cache
    mutate(prev => (prev ?? []).map(n => n.id === id ? { ...n, read: true } : n), { revalidate: false });
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      if (!res.ok) {
        // Revert
        mutate(prev => (prev ?? []).map(n => n.id === id ? { ...n, read: false } : n), { revalidate: false });
      }
    } catch (err) {
      console.error('[Notifications] markAsRead error:', err);
    }
  }, [mutate]);

  const markAllAsRead = useCallback(async () => {
    const previousCache = rawNotifications ?? [];
    mutate(prev => (prev ?? []).map(n => ({ ...n, read: true })), { revalidate: false });
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'PATCH' });
      if (!res.ok) {
        mutate(previousCache, { revalidate: false });
      }
    } catch (err) {
      console.error('[Notifications] markAllAsRead error:', err);
      mutate(previousCache, { revalidate: false });
    }
  }, [mutate, rawNotifications]);

  const deleteNotification = useCallback(async (id: string) => {
    const previousCache = rawNotifications ?? [];
    mutate(prev => (prev ?? []).filter(n => n.id !== id), { revalidate: false });
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        mutate(previousCache, { revalidate: false });
      }
    } catch (err) {
      console.error('[Notifications] deleteNotification error:', err);
      mutate(previousCache, { revalidate: false });
    }
  }, [mutate, rawNotifications]);

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Persist the last known count so the badge doesn't flash to 0 during
  // route transitions where authLoading briefly becomes true (swrKey → null
  // → rawNotifications → undefined).
  const stableUnreadCountRef = useRef(0);

  useEffect(() => {
    if (!shouldFetchPersonalNotifications) {
      stableUnreadCountRef.current = 0;
    }
  }, [shouldFetchPersonalNotifications]);

  const unreadCount = useMemo(() => {
    // rawNotifications is undefined when swrKey is null (auth resolving).
    // Return the last known count instead of resetting the badge to 0.
    if (rawNotifications === undefined) return stableUnreadCountRef.current;
    const count = Math.max(0, notifications.filter(n => !readNotifications.has(n.id)).length);
    stableUnreadCountRef.current = count;
    return count;
  }, [rawNotifications, notifications, readNotifications]);

  return (
    <NotificationsContext.Provider value={{
      notifications,
      toastQueue,
      dismissToast,
      unreadCount,
      isLoading,
      readNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      refetch,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationsProvider");
  return context;
}
