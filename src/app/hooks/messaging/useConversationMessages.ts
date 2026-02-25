'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import useSWRInfinite from 'swr/infinite';
import { mutate as globalMutate } from 'swr';
import { getBrowserSupabase } from '@/app/lib/supabase/client';
import { swrConfig } from '@/app/lib/swrConfig';
import { useAuth } from '@/app/contexts/AuthContext';
import type { ConversationMessage, MessagesPage, MessagingRole } from './types';

function buildMessageBaseKey(conversationId: string) {
  return `/api/conversations/${conversationId}/messages`;
}

async function fetchPage(url: string): Promise<MessagesPage> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error: any = new Error(payload?.error || `Failed to fetch messages (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function getFlattenedMessages(pages: MessagesPage[] | undefined): ConversationMessage[] {
  if (!pages || pages.length === 0) return [];
  return [...pages]
    .reverse()
    .flatMap((page) => page.data.messages || []);
}

function patchMessageInPages(
  pages: MessagesPage[] | undefined,
  matcher: (message: ConversationMessage) => boolean,
  patch: (message: ConversationMessage) => ConversationMessage
): MessagesPage[] | undefined {
  if (!pages || pages.length === 0) return pages;

  let didUpdate = false;
  const nextPages = pages.map((page) => {
    const nextMessages = page.data.messages.map((message) => {
      if (!matcher(message)) return message;
      didUpdate = true;
      return patch(message);
    });

    return {
      ...page,
      data: {
        ...page.data,
        messages: nextMessages,
      },
    };
  });

  return didUpdate ? nextPages : pages;
}

function appendOptimisticMessage(
  pages: MessagesPage[] | undefined,
  conversationId: string,
  optimisticMessage: ConversationMessage
): MessagesPage[] {
  if (!pages || pages.length === 0) {
    return [
      {
        data: {
          conversation_id: conversationId,
          messages: [optimisticMessage],
          has_more: false,
          next_cursor: null,
        },
      },
    ];
  }

  const nextPages = [...pages];
  const firstPage = nextPages[0];
  nextPages[0] = {
    ...firstPage,
    data: {
      ...firstPage.data,
      messages: [...firstPage.data.messages, optimisticMessage],
    },
  };

  return nextPages;
}

function updateConversationCaches(
  conversationId: string,
  text: string,
  conversationBusinessId?: string | null
) {
  const nextTimestamp = new Date().toISOString();
  const updateCache = (cacheKey: string) =>
    globalMutate(
      cacheKey,
      (previous: any) => {
        if (!previous?.data) return previous;

        const existingIndex = previous.data.findIndex((item: any) => item.id === conversationId);
        if (existingIndex === -1) return previous;

        const existing = previous.data[existingIndex];
        const updated = {
          ...existing,
          last_message_at: nextTimestamp,
          last_message_preview: text,
        };

        const nextData = [...previous.data];
        nextData.splice(existingIndex, 1);
        nextData.unshift(updated);

        return {
          ...previous,
          data: nextData,
        };
      },
      { revalidate: false }
    );

  void updateCache('/api/conversations?role=user');
  void updateCache('/api/conversations?role=business');
  if (conversationBusinessId) {
    void updateCache(`/api/conversations?role=business&business_id=${conversationBusinessId}`);
  }
}

export interface UseConversationMessagesOptions {
  conversationId: string | null;
  role: MessagingRole;
  conversationBusinessId?: string | null;
}

export function useConversationMessages({ conversationId, role, conversationBusinessId }: UseConversationMessagesOptions) {
  const { user } = useAuth();
  const supabaseRef = useRef(getBrowserSupabase());

  const getKey = useCallback(
    (pageIndex: number, previousPage: MessagesPage | null) => {
      if (!conversationId) return null;
      const base = buildMessageBaseKey(conversationId);

      if (pageIndex === 0) {
        return base;
      }

      if (!previousPage?.data?.has_more || !previousPage?.data?.next_cursor) {
        return null;
      }

      const params = new URLSearchParams({
        cursor: previousPage.data.next_cursor,
      });

      return `${base}?${params.toString()}`;
    },
    [conversationId]
  );

  const {
    data: pages,
    error,
    isLoading,
    isValidating,
    mutate,
    setSize,
    size,
  } = useSWRInfinite<MessagesPage>(getKey, fetchPage, {
    ...swrConfig,
    dedupingInterval: 2_000,
    revalidateFirstPage: false,
  });

  const messages = useMemo(() => getFlattenedMessages(pages), [pages]);
  const hasMore = Boolean(pages?.[pages.length - 1]?.data?.has_more);
  const isLoadingOlder = isValidating && size > (pages?.length || 0);

  const loadOlder = useCallback(() => {
    if (!hasMore || isLoadingOlder) return;
    setSize((current) => current + 1);
  }, [hasMore, isLoadingOlder, setSize]);

  const replaceMessage = useCallback(
    (targetId: string, nextMessage: ConversationMessage) => {
      mutate(
        (previousPages) =>
          patchMessageInPages(
            previousPages,
            (message) => message.id === targetId,
            () => nextMessage
          ),
        { revalidate: false }
      );
    },
    [mutate]
  );

  const sendMessage = useCallback(
    async (body: string, retryMessageId?: string) => {
      if (!conversationId || !user?.id) {
        return { ok: false, error: new Error('Missing conversation context') };
      }

      const trimmed = body.trim();
      if (!trimmed) {
        return { ok: false, error: new Error('Message body is required') };
      }

      const optimisticId = retryMessageId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimisticMessage: ConversationMessage = {
        id: optimisticId,
        conversation_id: conversationId,
        body: trimmed,
        status: 'sent',
        sender_type: role,
        sender_user_id: user.id,
        sender_business_id: role === 'business' ? (conversationBusinessId || null) : null,
        created_at: new Date().toISOString(),
        delivered_at: null,
        read_at: null,
        client_state: 'sending',
      };

      if (retryMessageId) {
        replaceMessage(retryMessageId, optimisticMessage);
      } else {
        mutate(
          (previousPages) => appendOptimisticMessage(previousPages, conversationId, optimisticMessage),
          { revalidate: false }
        );
      }

      updateConversationCaches(conversationId, trimmed, conversationBusinessId);

      try {
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: trimmed }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || `Failed to send message (${response.status})`);
        }

        const payload = await response.json();
        const serverMessage = payload?.data as ConversationMessage | undefined;
        if (!serverMessage) {
          throw new Error('Invalid send response');
        }

        replaceMessage(optimisticId, {
          ...serverMessage,
          client_state: null,
        });

        return {
          ok: true,
          message: serverMessage,
          optimisticId,
        };
      } catch (error: any) {
        replaceMessage(optimisticId, {
          ...optimisticMessage,
          client_state: 'failed',
        });

        return {
          ok: false,
          error,
          optimisticId,
        };
      }
    },
    [conversationBusinessId, conversationId, mutate, replaceMessage, role, user?.id]
  );

  const retryMessage = useCallback(
    async (message: ConversationMessage) => {
      return sendMessage(message.body, message.id);
    },
    [sendMessage]
  );

  const markAsRead = useCallback(async () => {
    if (!conversationId) return;

    const response = await fetch(`/api/conversations/${conversationId}/read`, {
      method: 'POST',
    });

    if (response.ok) {
      void globalMutate('/api/conversations?role=user');
      void globalMutate('/api/conversations?role=business');
      if (conversationBusinessId) {
        void globalMutate(`/api/conversations?role=business&business_id=${conversationBusinessId}`);
      }
    }
  }, [conversationBusinessId, conversationId]);

  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`messages-${conversationId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;

          if (row.sender_user_id === user.id) {
            return;
          }

          const incomingMessage: ConversationMessage = {
            id: row.id,
            conversation_id: row.conversation_id,
            body: row.body || row.content || '',
            status: row.status || 'sent',
            sender_type: row.sender_type || 'user',
            sender_user_id: row.sender_user_id,
            sender_business_id: row.sender_business_id,
            created_at: row.created_at,
            delivered_at: row.delivered_at,
            read_at: row.read_at,
            client_state: null,
          };

          mutate((previousPages) => {
            if (!previousPages || previousPages.length === 0) {
              return appendOptimisticMessage(previousPages, conversationId, incomingMessage);
            }

            if (previousPages.some((page) => page.data.messages.some((message) => message.id === incomingMessage.id))) {
              return previousPages;
            }

            return appendOptimisticMessage(previousPages, conversationId, incomingMessage);
          }, { revalidate: false });

          updateConversationCaches(conversationId, incomingMessage.body, conversationBusinessId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (!row?.id) return;

          mutate(
            (previousPages) =>
              patchMessageInPages(
                previousPages,
                (message) => message.id === row.id,
                (message) => ({
                  ...message,
                  status: row.status || message.status,
                  delivered_at: row.delivered_at || message.delivered_at,
                  read_at: row.read_at || message.read_at,
                })
              ),
            { revalidate: false }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationBusinessId, conversationId, mutate, user?.id]);

  return {
    messages,
    hasMore,
    isLoading,
    isLoadingOlder,
    isError: Boolean(error),
    error: error as Error | undefined,
    loadOlder,
    sendMessage,
    retryMessage,
    markAsRead,
    mutate,
  };
}
