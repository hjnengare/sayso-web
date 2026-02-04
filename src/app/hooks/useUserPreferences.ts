/**
 * Hook to fetch and manage user's interests, subcategories, and deal-breakers
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface UserPreference {
  id: string;
  name: string;
}

export interface UserPreferences {
  interests: UserPreference[];
  subcategories: UserPreference[];
  dealbreakers: UserPreference[];
}

export interface UseUserPreferencesResult extends UserPreferences {
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseUserPreferencesOptions {
  initialData?: UserPreferences;
  skipInitialFetch?: boolean;
}

const EMPTY_PREFS: UserPreferences = { interests: [], subcategories: [], dealbreakers: [] };
const PREFERENCES_CACHE_TTL_MS = 60_000;

const preferencesCache = new Map<string, { data: UserPreferences; fetchedAtMs: number }>();
const inFlightByUserId = new Map<string, Promise<UserPreferences>>();

function isCacheFresh(entry: { fetchedAtMs: number }) {
  return Date.now() - entry.fetchedAtMs < PREFERENCES_CACHE_TTL_MS;
}

async function fetchPreferencesOnce(userId: string): Promise<UserPreferences> {
  const cached = preferencesCache.get(userId);
  if (cached && isCacheFresh(cached)) return cached.data;

  const inFlight = inFlightByUserId.get(userId);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const response = await fetch('/api/user/preferences', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) return EMPTY_PREFS;

    const data = await response.json();
    const prefs: UserPreferences = {
      interests: data.interests || [],
      subcategories: data.subcategories || [],
      dealbreakers: data.dealbreakers || [],
    };

    preferencesCache.set(userId, { data: prefs, fetchedAtMs: Date.now() });
    return prefs;
  })();

  inFlightByUserId.set(userId, promise);
  try {
    return await promise;
  } finally {
    inFlightByUserId.delete(userId);
  }
}

/**
 * Hook to fetch user's preferences (interests, subcategories, dealbreakers)
 */
export function useUserPreferences(options: UseUserPreferencesOptions = {}): UseUserPreferencesResult {
  const { user, isLoading: authLoading } = useAuth();
  const [interests, setInterests] = useState<UserPreference[]>(options.initialData?.interests ?? []);
  const [subcategories, setSubcategories] = useState<UserPreference[]>(options.initialData?.subcategories ?? []);
  const [dealbreakers, setDealbreakers] = useState<UserPreference[]>(options.initialData?.dealbreakers ?? []);
  const [loading, setLoading] = useState(!(options.skipInitialFetch && options.initialData));
  const [error, setError] = useState<string | null>(null);
  const hasSkippedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const initialUserIdRef = useRef<string | null | undefined>(undefined);

  const fetchPreferences = async () => {
    console.log('[useUserPreferences] fetchPreferences called', {
      user: user ? 'exists' : 'null',
      authLoading,
    });
    
    // ✅ CRITICAL: If auth is still loading, do nothing yet (avoid flicker/reset)
    if (authLoading) {
      console.log('[useUserPreferences] Auth still loading, keeping loading state');
      setLoading(true);
      return;
    }
    
    // ✅ If auth is done and user is null => logged out (now safe to return empty)
    if (!user) {
      console.log('[useUserPreferences] Auth finished, no user - returning empty preferences');
      setInterests([]);
      setSubcategories([]);
      setDealbreakers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // De-duplicate: share a single in-flight request + short-lived cache per user.
      const cached = preferencesCache.get(user.id);
      if (cached && isCacheFresh(cached)) {
        setInterests(cached.data.interests || []);
        setSubcategories(cached.data.subcategories || []);
        setDealbreakers(cached.data.dealbreakers || []);
        setLoading(false);
        return;
      }

      const prefs = await fetchPreferencesOnce(user.id);

      setInterests(prefs.interests || []);
      setSubcategories(prefs.subcategories || []);
      setDealbreakers(prefs.dealbreakers || []);
      
      console.log('[useUserPreferences] Loaded preferences:', {
        interests: prefs.interests?.length || 0,
        subcategories: prefs.subcategories?.length || 0,
        dealbreakers: prefs.dealbreakers?.length || 0,
      });
    } catch (err: any) {
      console.error('[useUserPreferences] Error fetching user preferences:', err);
      // Gracefully handle errors - return empty arrays instead of breaking UI
      setInterests([]);
      setSubcategories([]);
      setDealbreakers([]);
      setError(null); // Don't show error to user
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const userChanged = lastUserIdRef.current !== currentUserId;
    lastUserIdRef.current = currentUserId;

    const hasInitialData = !!options.initialData;

    if (options.skipInitialFetch && hasInitialData) {
      if (!hasSkippedRef.current) {
        hasSkippedRef.current = true;
        // Prime shared cache so other callers (same user) don't refetch immediately.
        if (!authLoading && user?.id) {
          preferencesCache.set(user.id, {
            data: options.initialData ?? EMPTY_PREFS,
            fetchedAtMs: Date.now(),
          });
        }
        return;
      }

      if (authLoading) {
        return;
      }

      if (initialUserIdRef.current === undefined) {
        initialUserIdRef.current = currentUserId;
      }

      if (!userChanged || currentUserId === initialUserIdRef.current) {
        return;
      }
    }

    if (authLoading) {
      return;
    }

    fetchPreferences();
  }, [user?.id, authLoading]); // ✅ Also depend on authLoading to prevent premature fetches

  return {
    interests,
    subcategories,
    dealbreakers,
    loading,
    error,
    refetch: fetchPreferences,
  };
}

/**
 * Hook to get user's interest IDs (useful for filtering)
 */
export function useUserInterestIds(): string[] {
  const { interests, subcategories } = useUserPreferences();
  return interests.map(i => i.id).concat(subcategories.map(s => s.id));
}

