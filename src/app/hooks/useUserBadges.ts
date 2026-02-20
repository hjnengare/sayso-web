/**
 * Hook to fetch the current user's earned badges from the API.
 * Uses SWR for caching and deduplication.
 */

import { useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '../contexts/AuthContext';
import { swrConfig } from '../lib/swrConfig';

interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
}

export interface UserAchievement {
  achievement_id: string;
  earned_at: string;
  achievements: Achievement;
}

async function fetchUserBadges([, userId]: [string, string]): Promise<UserAchievement[]> {
  const response = await fetch(`/api/badges/user?user_id=${userId}`, { credentials: 'include' });

  if (response.status === 401) {
    return [];
  }

  if (!response.ok) {
    return [];
  }

  const result = await response.json();

  if (!result.ok || !Array.isArray(result.badges)) {
    return [];
  }

  return result.badges
    .filter((badge: any) => badge.earned)
    .map((badge: any) => ({
      achievement_id: badge.id,
      earned_at: badge.awarded_at || new Date().toISOString(),
      achievements: {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon_path,
        category: badge.badge_group || 'general',
      },
    }));
}

export function useUserBadges() {
  const { user, isLoading: authLoading } = useAuth();

  const swrKey = (!authLoading && user?.id)
    ? (['/api/badges/user', user.id] as [string, string])
    : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchUserBadges, {
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

  return {
    achievements: data ?? [],
    loading: authLoading || isLoading,
    error: error ? (error as Error).message : null,
    mutate,
  };
}
