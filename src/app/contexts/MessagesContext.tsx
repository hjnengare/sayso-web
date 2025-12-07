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
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
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
      console.error('Error fetching unread message count:', error);
      setUnreadCount(0);
      setIsLoading(false);
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

