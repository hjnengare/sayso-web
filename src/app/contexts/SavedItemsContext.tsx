"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

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
      const response = await fetch('/api/user/saved');
      
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated
          setSavedItems([]);
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to fetch saved businesses');
      }

      const data = await response.json();
      const businessIds = (data.businesses || []).map((b: any) => b.id);
      setSavedItems(businessIds);
    } catch (error) {
      console.error('Error fetching saved items:', error);
      // On error, keep existing saved items (don't clear them)
      // This prevents loss of data if API temporarily fails
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
      const response = await fetch('/api/user/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ business_id: itemId }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Revert optimistic update on error
        setSavedItems(prev => prev.filter(id => id !== itemId));
        showToast(error.error || 'Failed to save business', 'sage', 3000);
        return false;
      }

      showToast('Business saved!', 'success', 2000);
      return true;
    } catch (error) {
      console.error('Error saving business:', error);
      // Revert optimistic update on error
      setSavedItems(prev => prev.filter(id => id !== itemId));
      showToast('Failed to save business. Please try again.', 'sage', 3000);
      return false;
    }
  }, [user, showToast]);

  const removeSavedItem = useCallback(async (itemId: string): Promise<boolean> => {
    if (!user) {
      return false;
    }

    // Optimistically update UI
    setSavedItems(prev => prev.filter(id => id !== itemId));

    try {
      const response = await fetch(`/api/user/saved?business_id=${itemId}`, {
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

      showToast('Business removed from saved', 'success', 2000);
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
  }, [user, showToast]);

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
