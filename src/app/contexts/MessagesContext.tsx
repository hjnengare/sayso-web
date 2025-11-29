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
      // For now, calculate from mock data matching DM page logic
      // In production, this would fetch from an API: /api/user/messages/unread
      // Mock data: first 3 chats have unread counts (1, 2, 3) = total 6
      // This matches the pattern in src/app/dm/page.tsx where index < 3 has unreadCount
      const mockUnreadCount = 6; // Sum of unreadCount from first 3 chats (1+2+3)
      setUnreadCount(mockUnreadCount);
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

