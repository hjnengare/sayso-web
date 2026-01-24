"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { apiClient } from "../lib/api/apiClient";

interface SavedEventsContextType {
  savedEventIds: string[];
  savedEventsCount: number;
  isLoading: boolean;
  addSavedEvent: (eventId: string) => Promise<boolean>;
  removeSavedEvent: (eventId: string) => Promise<boolean>;
  isEventSaved: (eventId: string) => boolean;
  toggleSavedEvent: (eventId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const SavedEventsContext = createContext<SavedEventsContextType | undefined>(undefined);

interface SavedEventsProviderProps {
  children: ReactNode;
}

export function SavedEventsProvider({ children }: SavedEventsProviderProps) {
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { showToast } = useToast();

  // Load saved event IDs from API on mount or when user changes
  const fetchSavedEvents = useCallback(async () => {
    console.log('[SavedEventsContext] fetchSavedEvents called, user:', user?.id);
    if (!user) {
      setSavedEventIds([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Use shared API client with deduplication and caching
      console.log('[SavedEventsContext] Fetching from /api/saved/events...');
      const data = await apiClient.fetch<{ events: any[]; eventIds?: string[] }>(
        '/api/saved/events',
        {},
        {
          ttl: 15000, // 15 second cache
          useCache: true,
          cacheKey: '/api/saved/events',
        }
      );

      console.log('[SavedEventsContext] API response:', data);

      // Use eventIds from response if available, otherwise extract from events
      const eventIds = data.eventIds || (data.events || []).map((e: any) => e.id);
      console.log('[SavedEventsContext] Setting eventIds:', eventIds);
      setSavedEventIds(eventIds);
    } catch (error: any) {
      const errorMessage = error?.message || '';

      if (errorMessage.includes('401')) {
        // User not authenticated - expected for logged out users
        setSavedEventIds([]);
        setIsLoading(false);
        return;
      }

      // Check if it's a network error
      const isNetworkError = errorMessage.includes('fetch') ||
                             errorMessage.includes('network') ||
                             errorMessage.includes('Failed to fetch');

      if (isNetworkError) {
        // Network error - silently handle
        if (savedEventIds.length === 0) {
          setSavedEventIds([]);
        }
      } else {
        // Only log unexpected errors
        console.warn('Error fetching saved events (non-critical):', errorMessage);
        if (savedEventIds.length === 0) {
          setSavedEventIds([]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch saved events when user changes
  useEffect(() => {
    fetchSavedEvents();
  }, [fetchSavedEvents]);

  const addSavedEvent = useCallback(async (eventId: string): Promise<boolean> => {
    if (!user) {
      showToast('Please log in to save events', 'sage', 3000);
      return false;
    }

    // Optimistically update UI
    setSavedEventIds(prev => {
      if (!prev.includes(eventId)) {
        return [...prev, eventId];
      }
      return prev;
    });

    try {
      const response = await fetch('/api/saved/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event_id: eventId }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save event';
        try {
          const error = await response.json();
          errorMessage = error.error || error.details || error.message || errorMessage;

          // Check if it's a table/permission error
          if (error.code === '42P01' || error.code === '42501' ||
              errorMessage.toLowerCase().includes('relation') ||
              errorMessage.toLowerCase().includes('does not exist') ||
              errorMessage.toLowerCase().includes('permission denied') ||
              errorMessage.toLowerCase().includes('row-level security')) {
            errorMessage = 'Saved events feature is not available. Please contact support.';
          }
        } catch (parseError) {
          errorMessage = `Failed to save event (${response.status})`;
        }

        // Revert optimistic update on error
        setSavedEventIds(prev => prev.filter(id => id !== eventId));
        showToast(errorMessage, 'sage', 4000);
        return false;
      }

      showToast('Event saved!', 'success', 3000);

      // Trigger refetch to update saved events count
      await new Promise(resolve => setTimeout(resolve, 100));
      await fetchSavedEvents();

      return true;
    } catch (error) {
      console.error('Error saving event:', error);
      // Revert optimistic update on error
      setSavedEventIds(prev => prev.filter(id => id !== eventId));
      showToast('Failed to save event. Please try again.', 'sage', 3000);
      return false;
    }
  }, [user, showToast, fetchSavedEvents]);

  const removeSavedEvent = useCallback(async (eventId: string): Promise<boolean> => {
    if (!user) {
      return false;
    }

    // Optimistically update UI
    setSavedEventIds(prev => prev.filter(id => id !== eventId));

    try {
      const response = await fetch(`/api/saved/events?event_id=${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        // Revert optimistic update on error
        setSavedEventIds(prev => {
          if (!prev.includes(eventId)) {
            return [...prev, eventId];
          }
          return prev;
        });
        showToast(error.error || 'Failed to unsave event', 'sage', 3000);
        return false;
      }

      showToast('Event removed from saved', 'success', 3000);

      // Trigger refetch to update saved events count
      await fetchSavedEvents();

      return true;
    } catch (error) {
      console.error('Error unsaving event:', error);
      // Revert optimistic update on error
      setSavedEventIds(prev => {
        if (!prev.includes(eventId)) {
          return [...prev, eventId];
        }
        return prev;
      });
      showToast('Failed to unsave event. Please try again.', 'sage', 3000);
      return false;
    }
  }, [user, showToast, fetchSavedEvents]);

  const isEventSaved = useCallback((eventId: string) => {
    return savedEventIds.includes(eventId);
  }, [savedEventIds]);

  const toggleSavedEvent = useCallback(async (eventId: string): Promise<boolean> => {
    if (isEventSaved(eventId)) {
      return await removeSavedEvent(eventId);
    } else {
      return await addSavedEvent(eventId);
    }
  }, [isEventSaved, removeSavedEvent, addSavedEvent]);

  const savedEventsCount = useMemo(() => savedEventIds.length, [savedEventIds]);

  const value: SavedEventsContextType = useMemo(() => ({
    savedEventIds,
    savedEventsCount,
    isLoading,
    addSavedEvent,
    removeSavedEvent,
    isEventSaved,
    toggleSavedEvent,
    refetch: fetchSavedEvents,
  }), [savedEventIds, savedEventsCount, isLoading, addSavedEvent, removeSavedEvent, isEventSaved, toggleSavedEvent, fetchSavedEvents]);

  return (
    <SavedEventsContext.Provider value={value}>
      {children}
    </SavedEventsContext.Provider>
  );
}

export function useSavedEvents() {
  const context = useContext(SavedEventsContext);
  if (context === undefined) {
    throw new Error("useSavedEvents must be used within a SavedEventsProvider");
  }
  return context;
}
