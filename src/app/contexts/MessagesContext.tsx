"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { apiClient } from "../lib/api/apiClient";

interface MessagesContextType {
  unreadCount: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

interface MessagesProviderProps {
  children: ReactNode;
}

export function MessagesProvider({ children }: MessagesProviderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Use shared API client with deduplication and caching
      const result = await apiClient.fetch<{ data: any[] }>(
        '/api/messages/conversations',
        {},
        {
          ttl: 10000, // 10 second cache
          useCache: true,
          cacheKey: '/api/messages/conversations',
        }
      );
      
      // Sum up unread counts from all conversations
      const totalUnread = (result.data || []).reduce(
        (sum: number, conv: any) => sum + (conv.unread_count || 0),
        0
      );
      
      setUnreadCount(totalUnread);
      setIsLoading(false);
    } catch (error: any) {
      // Handle errors gracefully
      const errorMessage = error?.message || '';
      
      // If unauthorized (401), user is not logged in or session expired - not an error
      if (errorMessage.includes('401')) {
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }
      
      // Network errors - silently handle (user might be offline)
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        setUnreadCount(0);
        setIsLoading(false);
      } else {
        console.warn('Error fetching unread message count:', error);
        setUnreadCount(0);
        setIsLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    fetchUnreadCount();
    // Poll for updates every 60 seconds (reduced from 30s to reduce load)
    // API client will deduplicate concurrent requests
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, user]);

  return (
    <MessagesContext.Provider
      value={{
        unreadCount,
        isLoading,
        refetch: fetchUnreadCount,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error("useMessages must be used within a MessagesProvider");
  }
  return context;
}

