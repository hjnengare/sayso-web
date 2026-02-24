import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { NotificationsResponseDto } from '@sayso/contracts';
import { apiFetch } from '../lib/api';
import { ENV } from '../lib/env';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';

interface NotificationsContextValue {
  unreadCount: number;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

async function registerPushToken() {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const token = await Notifications.getExpoPushTokenAsync({ projectId: ENV.easProjectId });

  await apiFetch('/api/user/push-tokens', {
    method: 'POST',
    body: JSON.stringify({
      expoPushToken: token.data,
      platform: Device.osName?.toLowerCase() === 'ios' ? 'ios' : 'android',
      deviceId: Device.osInternalBuildId || Device.modelId || null,
      appVersion: Device.osVersion || null,
    }),
  });
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const data = await apiFetch<NotificationsResponseDto>('/api/notifications/user');
    const unread = data.notifications.filter((item) => !item.read).length;
    setUnreadCount(unread);
  };

  useEffect(() => {
    if (!user?.id) return;

    registerPushToken().catch((error) => {
      console.warn('[NotificationsProvider] Push token registration failed:', error);
    });

    refresh().catch((error) => {
      console.warn('[NotificationsProvider] Initial refresh failed:', error);
    });

    const channel = supabase
      .channel(`mobile-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refresh().catch(() => undefined);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      unreadCount,
      refresh,
    }),
    [unreadCount]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotificationsContext() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotificationsContext must be used within NotificationsProvider');
  return ctx;
}
