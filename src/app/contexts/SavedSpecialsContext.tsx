"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { apiClient } from "../lib/api/apiClient";

interface SavedSpecialsContextType {
  savedSpecialIds: string[];
  savedCount: number;
  isLoading: boolean;
  addSavedSpecial: (specialId: string) => Promise<boolean>;
  removeSavedSpecial: (specialId: string) => Promise<boolean>;
  isSpecialSaved: (specialId: string) => boolean;
  toggleSavedSpecial: (specialId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const SavedSpecialsContext = createContext<SavedSpecialsContextType | undefined>(undefined);

interface SavedSpecialsProviderProps {
  children: ReactNode;
}

export function SavedSpecialsProvider({ children }: SavedSpecialsProviderProps) {
  const [savedSpecialIds, setSavedSpecialIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { showToast } = useToast();

  // Load saved specials from API on mount or when user changes
  const fetchSavedSpecials = useCallback(async () => {
    if (!user) {
      setSavedSpecialIds([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Use shared API client with deduplication and caching
      const data = await apiClient.fetch<{ specials: any[] }>(
        '/api/saved/specials?limit=1000', // Get all saved specials for ID checking
        {},
        {
          ttl: 15000, // 15 second cache (saved items change less frequently)
          useCache: true,
          cacheKey: '/api/saved/specials',
        }
      );

      if (data?.specials) {
        const specialIds = data.specials.map((special: any) => special.id);
        setSavedSpecialIds(specialIds);
      } else {
        setSavedSpecialIds([]);
      }
    } catch (error) {
      console.error('[SavedSpecialsContext] Error fetching saved specials:', error);
      setSavedSpecialIds([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load saved specials on mount and when user changes
  useEffect(() => {
    fetchSavedSpecials();
  }, [fetchSavedSpecials]);

  // Add a saved special
  const addSavedSpecial = useCallback(async (specialId: string): Promise<boolean> => {
    if (!user) {
      showToast('Please log in to save specials', 'sage');
      return false;
    }

    try {
      const response = await fetch('/api/saved/specials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ special_id: specialId }),
      });

      const data = await response.json();

      if (data.success && data.isSaved) {
        // Update local state
        setSavedSpecialIds(prev => [...prev, specialId]);

        // Show success message only if it wasn't already saved
        if (!data.message?.includes('already saved')) {
          showToast('Special saved!', 'success');
        }

        return true;
      } else {
        showToast(data.error || 'Failed to save special', 'sage');
        return false;
      }
    } catch (error) {
      console.error('[SavedSpecialsContext] Error saving special:', error);
      showToast('Failed to save special', 'sage');
      return false;
    }
  }, [user, showToast]);

  // Remove a saved special
  const removeSavedSpecial = useCallback(async (specialId: string): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      const response = await fetch(`/api/saved/specials?specialId=${encodeURIComponent(specialId)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success && !data.isSaved) {
        // Update local state
        setSavedSpecialIds(prev => prev.filter(id => id !== specialId));
        showToast('Special removed from saved', 'success');
        return true;
      } else {
        showToast(data.error || 'Failed to unsave special', 'sage');
        return false;
      }
    } catch (error) {
      console.error('[SavedSpecialsContext] Error unsaving special:', error);
      showToast('Failed to unsave special', 'sage');
      return false;
    }
  }, [user, showToast]);

  // Check if a special is saved
  const isSpecialSaved = useCallback((specialId: string): boolean => {
    return savedSpecialIds.includes(specialId);
  }, [savedSpecialIds]);

  // Toggle saved state
  const toggleSavedSpecial = useCallback(async (specialId: string): Promise<boolean> => {
    if (isSpecialSaved(specialId)) {
      return await removeSavedSpecial(specialId);
    } else {
      return await addSavedSpecial(specialId);
    }
  }, [isSpecialSaved, addSavedSpecial, removeSavedSpecial]);

  // Refetch saved specials
  const refetch = useCallback(async () => {
    await fetchSavedSpecials();
  }, [fetchSavedSpecials]);

  const savedCount = savedSpecialIds.length;

  const value = useMemo(() => ({
    savedSpecialIds,
    savedCount,
    isLoading,
    addSavedSpecial,
    removeSavedSpecial,
    isSpecialSaved,
    toggleSavedSpecial,
    refetch,
  }), [
    savedSpecialIds,
    savedCount,
    isLoading,
    addSavedSpecial,
    removeSavedSpecial,
    isSpecialSaved,
    toggleSavedSpecial,
    refetch,
  ]);

  return (
    <SavedSpecialsContext.Provider value={value}>
      {children}
    </SavedSpecialsContext.Provider>
  );
}

export function useSavedSpecials() {
  const context = useContext(SavedSpecialsContext);
  if (context === undefined) {
    throw new Error('useSavedSpecials must be used within a SavedSpecialsProvider');
  }
  return context;
}