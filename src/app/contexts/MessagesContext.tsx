"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "./AuthContext";

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
      const response = await fetch('/api/messages/conversations');
      
      // Handle different error status codes gracefully
      if (!response.ok) {
        // If unauthorized (401), user is not logged in or session expired - not an error
        if (response.status === 401) {
          setUnreadCount(0);
          setIsLoading(false);
          return;
        }
        
        // For other errors, log but don't throw - just set count to 0
        const errorData = await response.json().catch(() => ({}));
        console.warn('Failed to fetch conversations:', response.status, errorData);
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }
      
      const result = await response.json();
      
      // Sum up unread counts from all conversations
      const totalUnread = (result.data || []).reduce(
        (sum: number, conv: any) => sum + (conv.unread_count || 0),
        0
      );
      
      setUnreadCount(totalUnread);
      setIsLoading(false);
    } catch (error) {
      // Network errors or other exceptions - silently handle
      // Only log if it's not a network error (which is common when offline)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error - user might be offline, silently handle
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
    fetchUnreadCount();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

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

