'use client';

import { useEffect, useMemo, useRef } from 'react';
import useSWR from 'swr';
import { mutate as globalMutate } from 'swr';
import { getBrowserSupabase } from '@/app/lib/supabase/client';
import { useAuth } from '@/app/contexts/AuthContext';
import { swrConfig } from '@/app/lib/swrConfig';
import type { ConversationsResponse, ConversationListItem, MessagingRole } from './types';

function buildConversationsKey(role: MessagingRole, businessId?: string | null): string {
  const params = new URLSearchParams({ role });
  if (role === 'business' && businessId) {
    params.set('business_id', businessId);
  }
  return `/api/conversations?${params.toString()}`;
}

async function fetcher(url: string): Promise<ConversationsResponse> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error: any = new Error(payload?.error || `Failed to fetch conversations (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function sortConversations(conversations: ConversationListItem[]): ConversationListItem[] {
  return [...conversations].sort(
    (left, right) => new Date(right.last_message_at).getTime() - new Date(left.last_message_at).getTime()
  );
}

export interface UseConversationsOptions {
  role: MessagingRole;
  businessId?: string | null;
  enabled?: boolean;
}

export function useConversations({ role, businessId, enabled = true }: UseConversationsOptions) {
  const { user } = useAuth();
  const key = enabled && user ? buildConversationsKey(role, businessId) : null;

  const { data, error, isLoading, mutate } = useSWR<ConversationsResponse>(
    key,
    fetcher,
    {
      ...swrConfig,
      dedupingInterval: 5_000,
      keepPreviousData: true,
    }
  );

  const unreadTotal = Number(data?.unread_total || 0);
  const conversations = useMemo(
    () => sortConversations(data?.data || []),
    [data?.data]
  );

  const supabaseRef = useRef(getBrowserSupabase());

  useEffect(() => {
    if (!key || !user?.id) return;

    const supabase = supabaseRef.current;
    const channelName = `conversations-${role}-${businessId || 'all'}-${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          ...(role === 'user'
            ? { filter: `user_id=eq.${user.id}` }
            : businessId
              ? { filter: `business_id=eq.${businessId}` }
              : {}),
        },
        (payload: any) => {
          const row = payload.new || payload.old;
          if (!row) return;

          if (role === 'business' && businessId && row.business_id !== businessId) {
            return;
          }

          mutate((previous) => {
            if (!previous?.data) {
              return previous;
            }

            if (payload.eventType === 'DELETE') {
              const nextRows = previous.data.filter((conversation) => conversation.id !== row.id);
              return {
                ...previous,
                data: nextRows,
                unread_total: nextRows.reduce((sum, item) => sum + Number(item.unread_count || 0), 0),
              };
            }

            const unreadCount = role === 'business'
              ? Number(row.business_unread_count || 0)
              : Number(row.user_unread_count || 0);

            const existingIndex = previous.data.findIndex((conversation) => conversation.id === row.id);
            if (existingIndex === -1) {
              void mutate();
              return previous;
            }

            const updated = {
              ...previous.data[existingIndex],
              last_message_at: row.last_message_at || previous.data[existingIndex].last_message_at,
              last_message_preview: row.last_message_preview || '',
              unread_count: unreadCount,
            };

            const nextRows = [...previous.data];
            nextRows.splice(existingIndex, 1);
            nextRows.unshift(updated);

            return {
              ...previous,
              data: sortConversations(nextRows),
              unread_total: nextRows.reduce((sum, item) => sum + Number(item.unread_count || 0), 0),
            };
          }, { revalidate: false });

          void globalMutate('/api/conversations?role=user');
          void globalMutate('/api/conversations?role=business');
          if (row.business_id) {
            void globalMutate(`/api/conversations?role=business&business_id=${row.business_id}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [key, user?.id, role, businessId, mutate]);

  return {
    key,
    conversations,
    unreadTotal,
    isLoading,
    isError: Boolean(error),
    error: error as Error | undefined,
    mutate,
  };
}

export function useMessageUnreadCount(options: UseConversationsOptions) {
  const { unreadTotal, isLoading, isError, error, mutate } = useConversations(options);

  return {
    unreadCount: unreadTotal,
    isLoading,
    isError,
    error,
    mutate,
  };
}
