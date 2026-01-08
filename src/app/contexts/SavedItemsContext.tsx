"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { apiClient } from "../lib/api/apiClient";

interface SavedItemsContextType {
  savedItems: string[];
  savedCount: number;
  isLoading: boolean;
  addSavedItem: (itemId: string) => Promise<boolean>;
  removeSavedItem: (itemId: string) => Promise<boolean>;
  isItemSaved: (itemId: string) => boolean;
  toggleSavedItem: (itemId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const SavedItemsContext = createContext<SavedItemsContextType | undefined>(undefined);

interface SavedItemsProviderProps {
  children: ReactNode;
}

export function SavedItemsProvider({ children }: SavedItemsProviderProps) {
  const [savedItems, setSavedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { showToast } = useToast();

  // Load saved items from API on mount or when user changes
  const fetchSavedItems = useCallback(async () => {
    if (!user) {
      setSavedItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Use shared API client with deduplication and caching
      const data = await apiClient.fetch<{ businesses: any[] }>(
        '/api/saved/businesses?limit=100',
        {},
        {
          ttl: 15000, // 15 second cache (saved items change less frequently)
          useCache: true,
          cacheKey: '/api/saved/businesses',
        }
      );
      
      const businessIds = (data.businesses || []).map((b: any) => b.id);
      console.log('SavedItemsContext - Fetched saved items:', {
        totalBusinesses: data.businesses?.length || 0,
        businessIds: businessIds,
        count: businessIds.length
      });
      setSavedItems(businessIds);
    } catch (error: any) {
      // Handle errors gracefully
      const errorMessage = error?.message || '';
      
      if (errorMessage.includes('401')) {
        // User not authenticated - this is expected for logged out users
        setSavedItems([]);
        setIsLoading(false);
        return;
      }
      
      // Check if it's a network error
      const isNetworkError = errorMessage.includes('fetch') || 
                           errorMessage.includes('network') ||
                           errorMessage.includes('Failed to fetch');
      
      if (isNetworkError) {
        // Network error - silently handle
        if (savedItems.length === 0) {
          setSavedItems([]);
        }
      } else {
        // Only log unexpected errors
        console.warn('Error fetching saved items (non-critical):', errorMessage);
        if (savedItems.length === 0) {
          setSavedItems([]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch saved items when user changes
  useEffect(() => {
    fetchSavedItems();
  }, [fetchSavedItems]);

  const addSavedItem = useCallback(async (itemId: string): Promise<boolean> => {
    if (!user) {
      showToast('Please log in to save businesses', 'sage', 3000);
      return false;
    }

    // Optimistically update UI
    setSavedItems(prev => {
      if (!prev.includes(itemId)) {
        return [...prev, itemId];
      }
      return prev;
    });

    try {
      const response = await fetch('/api/saved/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ business_id: itemId }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save business';
        try {
          const error = await response.json();
          errorMessage = error.error || error.details || error.message || errorMessage;
          
          // Log detailed error for debugging
          console.error('Save business API error:', {
            status: response.status,
            error: error,
            business_id: itemId
          });
          
          // Check if it's a table/permission error
          if (error.code === '42P01' || error.code === '42501' || 
              errorMessage.toLowerCase().includes('relation') ||
              errorMessage.toLowerCase().includes('does not exist') ||
              errorMessage.toLowerCase().includes('permission denied') ||
              errorMessage.toLowerCase().includes('row-level security')) {
            errorMessage = 'Saved businesses feature is not available. Please contact support.';
          }
        } catch (parseError) {
          console.error('Error parsing save response:', parseError);
          errorMessage = `Failed to save business (${response.status})`;
        }
        
        // Revert optimistic update on error
        setSavedItems(prev => prev.filter(id => id !== itemId));
        showToast(errorMessage, 'sage', 4000);
        return false;
      }

      // Show success toast with longer duration and more prominent message
      showToast('✨ Business saved! Check your saved items to view it.', 'success', 4500);
      
      // Trigger refetch to update saved items count
      // Add a small delay to ensure the database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 100));
      await fetchSavedItems();
      
      return true;
    } catch (error) {
      console.error('Error saving business:', error);
      // Revert optimistic update on error
      setSavedItems(prev => prev.filter(id => id !== itemId));
      showToast('Failed to save business. Please try again.', 'sage', 3000);
      return false;
    }
  }, [user, showToast, fetchSavedItems]);

  const removeSavedItem = useCallback(async (itemId: string): Promise<boolean> => {
    if (!user) {
      return false;
    }

    // Optimistically update UI
    setSavedItems(prev => prev.filter(id => id !== itemId));

    try {
      const response = await fetch(`/api/saved/businesses/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        // Revert optimistic update on error
        setSavedItems(prev => {
          if (!prev.includes(itemId)) {
            return [...prev, itemId];
          }
          return prev;
        });
        showToast(error.error || 'Failed to unsave business', 'sage', 3000);
        return false;
      }

      showToast('Business removed from saved', 'success', 3000);
      
      // Trigger refetch to update saved items count
      await fetchSavedItems();
      
      return true;
    } catch (error) {
      console.error('Error unsaving business:', error);
      // Revert optimistic update on error
      setSavedItems(prev => {
        if (!prev.includes(itemId)) {
          return [...prev, itemId];
        }
        return prev;
      });
      showToast('Failed to unsave business. Please try again.', 'sage', 3000);
      return false;
    }
  }, [user, showToast, fetchSavedItems]);

  const isItemSaved = useCallback((itemId: string) => {
    return savedItems.includes(itemId);
  }, [savedItems]);

  const toggleSavedItem = useCallback(async (itemId: string): Promise<boolean> => {
    if (isItemSaved(itemId)) {
      return await removeSavedItem(itemId);
    } else {
      return await addSavedItem(itemId);
    }
  }, [isItemSaved, removeSavedItem, addSavedItem]);

  const savedCount = useMemo(() => savedItems.length, [savedItems]);

  const value: SavedItemsContextType = useMemo(() => ({
    savedItems,
    savedCount,
    isLoading,
    addSavedItem,
    removeSavedItem,
    isItemSaved,
    toggleSavedItem,
    refetch: fetchSavedItems,
  }), [savedItems, savedCount, isLoading, addSavedItem, removeSavedItem, isItemSaved, toggleSavedItem, fetchSavedItems]);

  return (
    <SavedItemsContext.Provider value={value}>
      {children}
    </SavedItemsContext.Provider>
  );
}

export function useSavedItems() {
  const context = useContext(SavedItemsContext);
  if (context === undefined) {
    throw new Error("useSavedItems must be used within a SavedItemsProvider");
  }
  return context;
}
