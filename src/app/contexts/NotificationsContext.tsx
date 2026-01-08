"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";
import type { ToastNotificationData } from "../data/notificationData";
import { formatTimeAgo } from "../utils/formatTimeAgo";
import { apiClient } from "../lib/api/apiClient";

interface NotificationsContextType {
  notifications: ToastNotificationData[];
  unreadCount: number;
  isLoading: boolean;
  readNotifications: Set<string>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  refetch: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

interface NotificationsProviderProps {
  children: ReactNode;
}

interface DatabaseNotification {
  id: string;
  user_id: string;
  type: 'review' | 'business' | 'user' | 'highlyRated';
  message: string;
  title: string;
  image: string | null;
  image_alt: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const [notifications, setNotifications] = useState<ToastNotificationData[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Convert database notification to ToastNotificationData format
  const convertToToastNotification = useCallback((dbNotification: DatabaseNotification): ToastNotificationData => {
    return {
      id: dbNotification.id,
      type: dbNotification.type,
      message: dbNotification.message,
      title: dbNotification.title,
      timeAgo: formatTimeAgo(dbNotification.created_at),
      image: dbNotification.image || '/png/restaurants.png',
      imageAlt: dbNotification.image_alt || 'Notification',
      link: dbNotification.link || undefined,
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setReadNotifications(new Set());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Use shared API client with deduplication and caching
      const data = await apiClient.fetch<{ notifications: DatabaseNotification[] }>(
        '/api/notifications',
        {},
        {
          ttl: 10000, // 10 second cache
          useCache: true,
          cacheKey: '/api/notifications',
        }
      );
      
      const dbNotifications: DatabaseNotification[] = data.notifications || [];
      
      // Convert database notifications to ToastNotificationData format
      const convertedNotifications = dbNotifications.map(convertToToastNotification);
      setNotifications(convertedNotifications);
      
      // Set read notifications from database
      const readIds = new Set(
        dbNotifications
          .filter(n => n.read)
          .map(n => n.id)
      );
      setReadNotifications(readIds);
      
      setIsLoading(false);
    } catch (error: any) {
      // Handle errors gracefully
      const errorMessage = error?.message || '';
      
      // 401/403 means user is not authenticated - this is expected during transitions
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        setNotifications([]);
        setReadNotifications(new Set());
        setIsLoading(false);
        return;
      }
      
      // Network errors - handle gracefully
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        setNotifications([]);
        setIsLoading(false);
      } else {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
        setIsLoading(false);
      }
    }
  }, [user, convertToToastNotification]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistically update UI
    setReadNotifications(prev => new Set(prev).add(id));
    
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        // Revert on error
        setReadNotifications(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        throw new Error('Failed to mark notification as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    // Optimistically update UI
    const allIds = new Set(notifications.map(n => n.id));
    setReadNotifications(allIds);
    
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        // Revert on error - restore previous read state
        const previousRead = notifications
          .filter(n => readNotifications.has(n.id))
          .map(n => n.id);
        setReadNotifications(new Set(previousRead));
        throw new Error('Failed to mark all notifications as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [notifications, readNotifications]);

  const deleteNotification = useCallback(async (id: string) => {
    // Optimistically update UI
    const notificationToDelete = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setReadNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        // Revert on error
        if (notificationToDelete) {
          setNotifications(prev => [...prev, notificationToDelete].sort((a, b) => {
            // Sort by original order (we'd need to track this, but for now just append)
            return 0;
          }));
        }
        throw new Error('Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  const unreadCount = notifications.filter(n => !readNotifications.has(n.id)).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        readNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refetch: fetchNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}

