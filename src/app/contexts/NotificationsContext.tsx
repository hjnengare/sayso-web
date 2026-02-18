"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from "react";
import { useAuth } from "./AuthContext";
import { formatTimeAgo } from "../utils/formatTimeAgo";
import { apiClient } from "../lib/api/apiClient";
import { getBrowserSupabase } from "../lib/supabase/client";

// Type for notification data displayed in toast/UI
export type NotificationType =
  | 'review'
  | 'business'
  | 'user'
  | 'highlyRated'
  | 'message'
  | 'otp_sent'
  | 'otp_verified'
  | 'claim_status_changed'
  | 'docs_requested'
  | 'docs_received'
  | 'gamification'
  | 'badge_earned'
  | 'review_helpful'
  | 'business_approved'
  | 'claim_approved'
  | 'comment_reply'
  | 'photo_approved'
  | 'milestone_achievement';

export interface ToastNotificationData {
  id: string;
  type: NotificationType;
  message: string;
  title: string;
  timeAgo: string;
  image: string;
  imageAlt: string;
  link?: string;
}

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
  type: string;
  message: string;
  title: string;
  image: string | null;
  image_alt: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
  updated_at: string;
}

const USER_NOTIFICATIONS_ENDPOINT = '/api/notifications/user';

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const [notifications, setNotifications] = useState<ToastNotificationData[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const userCurrentRole = user?.profile?.account_role || user?.profile?.role || "user";
  const isBusinessAccountUser = userCurrentRole === "business_owner";
  const supabaseRef = useRef(getBrowserSupabase());
  
  // Ensure clean state on user change (fixes stuck counts when switching accounts)
  useEffect(() => {
    if (!user || isBusinessAccountUser) {
      setNotifications([]);
      setReadNotifications(new Set());
      setIsLoading(false);
    }
  }, [user?.id, isBusinessAccountUser]);

  // Convert database notification to ToastNotificationData format
  const convertToToastNotification = useCallback((dbNotification: DatabaseNotification): ToastNotificationData => {
    return {
      id: dbNotification.id,
      type: dbNotification.type as NotificationType,
      message: dbNotification.message,
      title: dbNotification.title,
      timeAgo: formatTimeAgo(dbNotification.created_at),
      image: dbNotification.image || '/png/restaurants.png',
      imageAlt: dbNotification.image_alt || 'Notification',
      link: dbNotification.link || undefined,
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setReadNotifications(new Set());
      setIsLoading(false);
      return;
    }
    if (isBusinessAccountUser) {
      setNotifications([]);
      setReadNotifications(new Set());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Use shared API client with deduplication and caching
      const data = await apiClient.fetch<{ notifications: DatabaseNotification[] }>(
        USER_NOTIFICATIONS_ENDPOINT,
        {},
        {
          ttl: 10000, // 10 second cache
          useCache: true,
          cacheKey: `${USER_NOTIFICATIONS_ENDPOINT}:${userId}`,
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
        console.warn('[Notifications] Network error, resetting to empty state');
        setNotifications([]);
        setReadNotifications(new Set());
        setIsLoading(false);
      } else {
        console.error('Error fetching notifications:', error);
        // On error, reset to empty state (prevents stuck counts)
        setNotifications([]);
        setReadNotifications(new Set());
        setIsLoading(false);
      }
    }
  }, [userId, isBusinessAccountUser, convertToToastNotification]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!userId || isBusinessAccountUser) return;

    const supabase = supabaseRef.current;
    let fallbackPollInterval: ReturnType<typeof setInterval> | null = null;

    const startFallbackPolling = () => {
      if (fallbackPollInterval) return;
      // Keep notifications fresh when realtime channel cannot be established.
      fallbackPollInterval = setInterval(() => {
        void fetchNotifications();
      }, 30000);
    };

    const stopFallbackPolling = () => {
      if (!fallbackPollInterval) return;
      clearInterval(fallbackPollInterval);
      fallbackPollInterval = null;
    };
    
    // Subscribe to notifications table for current user
    const channel = supabase
      .channel(`notifications-user-${userId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Notifications] New notification received:', payload);
          
          // Add new notification to state immediately
          const newNotification = convertToToastNotification(payload.new as DatabaseNotification);
          setNotifications(prev => [newNotification, ...prev]);
          
          // Play notification sound or show toast (optional)
          // You can add a toast notification here if needed
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Notifications] Notification updated:', payload);
          
          // Update notification in state
          const updatedNotification = convertToToastNotification(payload.new as DatabaseNotification);
          setNotifications(prev =>
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
          
          // Update read status
          if ((payload.new as DatabaseNotification).read) {
            setReadNotifications(prev => new Set(prev).add(updatedNotification.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Notifications] Notification deleted:', payload);
          
          // Remove notification from state
          const deletedId = (payload.old as DatabaseNotification).id;
          setNotifications(prev => prev.filter(n => n.id !== deletedId));
          setReadNotifications(prev => {
            const newSet = new Set(prev);
            newSet.delete(deletedId);
            return newSet;
          });
        }
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          stopFallbackPolling();
          console.log('✅ [Notifications] Successfully subscribed to real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Notifications] Realtime channel error. Falling back to polling.', error);
          startFallbackPolling();
          void fetchNotifications();
        } else if (status === 'TIMED_OUT') {
          console.warn('[Notifications] Realtime subscription timed out. Falling back to polling.');
          startFallbackPolling();
          void fetchNotifications();
        } else if (status === 'CLOSED') {
          console.log('[Notifications] Realtime channel closed');
          startFallbackPolling();
        }
      });

    // Cleanup subscription on unmount
    return () => {
      stopFallbackPolling();
      console.log('[Notifications] Unsubscribing from real-time updates');
      supabase.removeChannel(channel);
    };
  }, [userId, isBusinessAccountUser, convertToToastNotification, fetchNotifications]);

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

  // Calculate unread count with defensive guards (prevent stuck counts)
  const unreadCount = useMemo(() => {
    const count = notifications.filter(n => !readNotifications.has(n.id)).length;
    // Ensure always returns a valid non-negative number
    return Math.max(0, count || 0);
  }, [notifications, readNotifications]);

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

