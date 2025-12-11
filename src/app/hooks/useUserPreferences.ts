/**
 * Hook to fetch and manage user's interests, subcategories, and deal-breakers
 */

import { useState, useEffect } from 'react';
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

/**
 * Hook to fetch user's preferences (interests, subcategories, dealbreakers)
 */
export function useUserPreferences(): UseUserPreferencesResult {
  const { user } = useAuth();
  const [interests, setInterests] = useState<UserPreference[]>([]);
  const [subcategories, setSubcategories] = useState<UserPreference[]>([]);
  const [dealbreakers, setDealbreakers] = useState<UserPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = async () => {
    if (!user) {
      setInterests([]);
      setSubcategories([]);
      setDealbreakers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/user/preferences', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // Handle 404 specifically - route might not exist or user not authenticated
        if (response.status === 404) {
          console.warn('[useUserPreferences] API route not found (404). This may be expected if user is not authenticated or route is not available.');
        } else {
          console.error('[useUserPreferences] API returned error:', response.status, response.statusText);
        }
        // Don't throw - return empty preferences instead
        setInterests([]);
        setSubcategories([]);
        setDealbreakers([]);
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      setInterests(data.interests || []);
      setSubcategories(data.subcategories || []);
      setDealbreakers(data.dealbreakers || []);
      
      console.log('[useUserPreferences] Loaded preferences:', {
        interests: data.interests?.length || 0,
        subcategories: data.subcategories?.length || 0,
        dealbreakers: data.dealbreakers?.length || 0,
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
    fetchPreferences();
  }, [user?.id]);

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

