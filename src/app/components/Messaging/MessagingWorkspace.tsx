'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Loader2, MessageCircle, Search, Send } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  useConversationMessages,
  useConversations,
  type ConversationListItem,
  type ConversationMessage,
  type MessagingRole,
} from '@/app/hooks/messaging';

interface BusinessOption {
  id: string;
  name: string;
  image_url?: string | null;
}

interface MessagingWorkspaceProps {
  role: MessagingRole;
  title: string;
  subtitle?: string;
  topPaddingClassName?: string;
  viewportClassName?: string;
  businessOptions?: BusinessOption[];
  initialBusinessId?: string | null;
  initialConversationId?: string | null;
  startBusinessId?: string | null;
  startUserId?: string | null;
}

interface MessageVisualIdentity {
  name: string;
  avatarUrl: string | null;
}

interface MessageBubbleAvatarProps {
  name: string;
  avatarUrl?: string | null;
}

function buildInitials(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'U';

  const segments = trimmed.split(/\s+/).filter(Boolean);
  if (segments.length === 1) {
    return segments[0].slice(0, 2).toUpperCase();
  }

  return `${segments[0][0] || ''}${segments[1][0] || ''}`.toUpperCase();
}

function MessageBubbleAvatar({ name, avatarUrl }: MessageBubbleAvatarProps) {
  const normalizedAvatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
  const [hasImageError, setHasImageError] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    setHasImageError(false);
    setIsImageLoaded(false);
  }, [normalizedAvatarUrl]);

  const shouldRenderImage = normalizedAvatarUrl.length > 0 && !hasImageError;
  const initials = useMemo(() => buildInitials(name), [name]);

  return (
    <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-charcoal/15 bg-charcoal/10 sm:h-9 sm:w-9">
      {shouldRenderImage ? (
        <>
          {!isImageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-charcoal/10" aria-hidden />
          )}
          <Image
            src={normalizedAvatarUrl}
            alt={`${name} avatar`}
            fill
            sizes="(max-width: 640px) 32px, 36px"
            className={`object-cover transition-opacity duration-150 ${
              isImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            unoptimized={normalizedAvatarUrl.includes('supabase.co')}
            onLoad={() => setIsImageLoaded(true)}
            onError={() => {
              setHasImageError(true);
              setIsImageLoaded(false);
            }}
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-charcoal/70 sm:text-xs">
          {initials}
        </div>
      )}
    </div>
  );
}

function formatListTimestamp(value: string): string {
  if (!value) return '';

  const date = new Date(value);
  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatThreadTimestamp(value: string): string {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getConversationTitle(conversation: ConversationListItem, role: MessagingRole): string {
  if (role === 'business') {
    return conversation.participant?.display_name || 'Customer';
  }
  return conversation.business?.name || 'Business';
}

function getConversationSubtitle(conversation: ConversationListItem, role: MessagingRole): string {
  if (role === 'business') {
    return conversation.business?.name || 'Business';
  }
  return conversation.business?.category || 'Business';
}

function getConversationAvatar(conversation: ConversationListItem, role: MessagingRole): string | null {
  if (role === 'business') {
    return conversation.participant?.avatar_url || null;
  }
  return conversation.business?.image_url || null;
}

function getStatusLabel(message: ConversationMessage): string {
  if (message.client_state === 'sending') return 'Sending';
  if (message.client_state === 'failed') return 'Failed';
  if (message.status === 'read') return 'Read';
  if (message.status === 'delivered') return 'Delivered';
  return 'Sent';
}

export default function MessagingWorkspace({
  role,
  title,
  subtitle,
  topPaddingClassName = '',
  viewportClassName = 'h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-5rem)]',
  businessOptions,
  initialBusinessId,
  initialConversationId,
  startBusinessId,
  startUserId,
}: MessagingWorkspaceProps) {
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(initialBusinessId || null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [composerValue, setComposerValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isResolvingStartConversation, setIsResolvingStartConversation] = useState(false);
  const [startConversationError, setStartConversationError] = useState<string | null>(null);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(Boolean(initialConversationId));
  const [animatedMessageIds, setAnimatedMessageIds] = useState<Set<string>>(new Set());
  const previousMessageIdsRef = useRef<string[]>([]);
  const hasInitializedMessagesRef = useRef(false);
  const animationTimeoutsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (role !== 'business') return;
    if (startBusinessId) {
      setActiveBusinessId(startBusinessId);
      return;
    }
    if (!activeBusinessId && businessOptions && businessOptions.length > 0) {
      setActiveBusinessId(null);
    }
  }, [activeBusinessId, businessOptions, role, startBusinessId]);

  const {
    conversations,
    unreadTotal,
    isLoading: conversationsLoading,
    mutate: mutateConversations,
  } = useConversations({
    role,
    businessId: role === 'business' ? activeBusinessId : undefined,
    enabled: Boolean(user),
  });

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  useEffect(() => {
    if (!selectedConversationId || conversationsLoading) return;

    const stillExists = conversations.some((conversation) => conversation.id === selectedConversationId);
    if (!stillExists) {
      setSelectedConversationId(null);
      setMobileThreadOpen(false);
    }
  }, [conversations, conversationsLoading, selectedConversationId]);

  const {
    messages,
    hasMore,
    isLoading: messagesLoading,
    isLoadingOlder,
    loadOlder,
    sendMessage,
    retryMessage,
    markAsRead,
  } = useConversationMessages({
    conversationId: selectedConversationId,
    role,
    conversationBusinessId: selectedConversation?.business_id || activeBusinessId,
  });

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((conversation) => {
      const titleValue = getConversationTitle(conversation, role).toLowerCase();
      const subtitleValue = getConversationSubtitle(conversation, role).toLowerCase();
      return (
        titleValue.includes(query) ||
        subtitleValue.includes(query) ||
        conversation.last_message_preview.toLowerCase().includes(query)
      );
    });
  }, [conversations, role, searchQuery]);

  const resolveStartRef = useRef(false);

  useEffect(() => {
    return () => {
      animationTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      animationTimeoutsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    previousMessageIdsRef.current = [];
    hasInitializedMessagesRef.current = false;
    setAnimatedMessageIds(new Set());
    animationTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    animationTimeoutsRef.current.clear();
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;

    const currentMessageIds = messages.map((message) => message.id);
    const previousMessageIds = previousMessageIdsRef.current;

    if (!hasInitializedMessagesRef.current) {
      previousMessageIdsRef.current = currentMessageIds;
      hasInitializedMessagesRef.current = true;
      return;
    }

    const hasAppendedMessages =
      currentMessageIds.length > previousMessageIds.length &&
      previousMessageIds.every((id, index) => currentMessageIds[index] === id);

    if (hasAppendedMessages) {
      const appendedMessageIds = currentMessageIds.slice(previousMessageIds.length);

      if (appendedMessageIds.length > 0) {
        setAnimatedMessageIds((prev) => {
          const next = new Set(prev);
          appendedMessageIds.forEach((id) => next.add(id));
          return next;
        });

        appendedMessageIds.forEach((id) => {
          const existingTimeout = animationTimeoutsRef.current.get(id);
          if (existingTimeout) {
            window.clearTimeout(existingTimeout);
          }

          const timeoutId = window.setTimeout(() => {
            setAnimatedMessageIds((prev) => {
              if (!prev.has(id)) return prev;
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            animationTimeoutsRef.current.delete(id);
          }, prefersReducedMotion ? 120 : 220);

          animationTimeoutsRef.current.set(id, timeoutId);
        });
      }
    }

    previousMessageIdsRef.current = currentMessageIds;
  }, [messages, prefersReducedMotion, selectedConversationId]);

  useEffect(() => {
    if (!user?.id) return;
    if (resolveStartRef.current) return;

    if (initialConversationId) {
      resolveStartRef.current = true;
      setSelectedConversationId(initialConversationId);
      setMobileThreadOpen(true);
      return;
    }

    if (!startBusinessId) {
      return;
    }

    resolveStartRef.current = true;
    setIsResolvingStartConversation(true);
    setStartConversationError(null);

    const payload: Record<string, string> = {
      business_id: startBusinessId,
    };

    if (startUserId) {
      payload.user_id = startUserId;
    }

    void fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload?.error || 'Failed to start conversation');
        }

        const data = await response.json();
        const conversationId = data?.data?.id;
        if (conversationId) {
          setSelectedConversationId(conversationId);
          setMobileThreadOpen(true);
          void mutateConversations();
        }
      })
      .catch((error: any) => {
        setStartConversationError(error?.message || 'Failed to start conversation');
      })
      .finally(() => {
        setIsResolvingStartConversation(false);
      });
  }, [initialConversationId, mutateConversations, startBusinessId, startUserId, user?.id]);

  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    setMobileThreadOpen(true);
  }, []);

  const handleSend = useCallback(async () => {
    if (!selectedConversationId || !composerValue.trim() || isSending) return;

    setIsSending(true);
    const currentValue = composerValue;
    setComposerValue('');

    const result = await sendMessage(currentValue);
    if (!result.ok) {
      setComposerValue(currentValue);
    }

    setIsSending(false);
  }, [composerValue, isSending, selectedConversationId, sendMessage]);

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const nearBottomRef = useRef(true);

  useEffect(() => {
    const node = threadScrollRef.current;
    if (!node) return;

    const onScroll = () => {
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      nearBottomRef.current = distance < 120;
    };

    onScroll();
    node.addEventListener('scroll', onScroll);

    return () => {
      node.removeEventListener('scroll', onScroll);
    };
  }, [selectedConversationId]);

  useEffect(() => {
    const node = threadScrollRef.current;
    if (!node || !selectedConversationId) return;

    if (nearBottomRef.current) {
      node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length, selectedConversationId]);

  useEffect(() => {
    const node = threadScrollRef.current;
    if (!node || !selectedConversationId) return;

    requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
      nearBottomRef.current = true;
    });
  }, [selectedConversationId]);

  const isThreadVisible = Boolean(selectedConversationId) && mobileThreadOpen;
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  useEffect(() => {
    if (!selectedConversationId || !isThreadVisible || messages.length === 0) return;

    if (!latestMessage || latestMessage.sender_type === role) return;

    const timer = window.setTimeout(() => {
      void markAsRead();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [isThreadVisible, latestMessage, markAsRead, messages.length, role, selectedConversationId]);

  const listPaneVisibleClass = mobileThreadOpen ? 'hidden lg:flex' : 'flex';
  const threadPaneVisibleClass = mobileThreadOpen ? 'flex' : 'hidden lg:flex';
  const selectedBusinessOption = useMemo(() => {
    if (!businessOptions || businessOptions.length === 0) return null;

    const targetBusinessId =
      selectedConversation?.business?.id ||
      selectedConversation?.business_id ||
      activeBusinessId;

    if (!targetBusinessId) return null;
    return businessOptions.find((business) => business.id === targetBusinessId) || null;
  }, [
    activeBusinessId,
    businessOptions,
    selectedConversation?.business?.id,
    selectedConversation?.business_id,
  ]);

  const businessIdentity = useMemo<MessageVisualIdentity>(
    () => ({
      name: selectedConversation?.business?.name || selectedBusinessOption?.name || 'Business',
      avatarUrl: selectedConversation?.business?.image_url || selectedBusinessOption?.image_url || null,
    }),
    [
      selectedBusinessOption?.image_url,
      selectedBusinessOption?.name,
      selectedConversation?.business?.image_url,
      selectedConversation?.business?.name,
    ]
  );

  const participantIdentity = useMemo<MessageVisualIdentity>(
    () => ({
      name:
        selectedConversation?.participant?.display_name ||
        selectedConversation?.participant?.username ||
        'Customer',
      avatarUrl: selectedConversation?.participant?.avatar_url || null,
    }),
    [
      selectedConversation?.participant?.avatar_url,
      selectedConversation?.participant?.display_name,
      selectedConversation?.participant?.username,
    ]
  );

  const userIdentity = useMemo<MessageVisualIdentity>(
    () => ({
      name:
        user?.profile?.display_name ||
        user?.profile?.username ||
        (user?.email ? user.email.split('@')[0] : '') ||
        'You',
      avatarUrl: user?.profile?.avatar_url || user?.avatar_url || null,
    }),
    [
      user?.avatar_url,
      user?.email,
      user?.profile?.avatar_url,
      user?.profile?.display_name,
      user?.profile?.username,
    ]
  );

  const resolveMessageIdentity = useCallback(
    (ownMessage: boolean): MessageVisualIdentity => {
      if (role === 'user') {
        return ownMessage ? userIdentity : businessIdentity;
      }

      return ownMessage ? businessIdentity : participantIdentity;
    },
    [businessIdentity, participantIdentity, role, userIdentity]
  );

  return (
    <>
      <div className={`bg-off-white ${topPaddingClassName}`}>
        <div className={`mx-auto flex w-full max-w-7xl overflow-hidden ${viewportClassName}`}>
        <aside
          className={`${listPaneVisibleClass} w-full lg:w-[360px] xl:w-[420px] flex-col border-r border-charcoal/10 bg-off-white`}
        >
          <div className="border-b border-charcoal/10 px-4 py-4 sm:px-5">
            <h1 className="text-xl font-bold text-charcoal" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {title}
            </h1>
            <p className="mt-0.5 text-sm text-charcoal/55" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {subtitle || `${unreadTotal} unread`}
            </p>

            {role === 'business' && businessOptions && businessOptions.length > 0 && (
              <div className="mt-3">
                <label className="sr-only" htmlFor="business-filter">Business filter</label>
                <select
                  id="business-filter"
                  value={activeBusinessId || '__all__'}
                  onChange={(event) => {
                    const value = event.target.value;
                    setActiveBusinessId(value === '__all__' ? null : value);
                    setSelectedConversationId(null);
                    setMobileThreadOpen(false);
                  }}
                  className="w-full rounded-xl border border-charcoal/15 bg-white px-3 py-2 text-sm text-charcoal focus:border-navbar-bg/40 focus:outline-none focus:ring-2 focus:ring-navbar-bg/20"
                  style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                >
                  <option value="__all__">All businesses</option>
                  {businessOptions.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/45" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search conversations"
                className="w-full rounded-full border border-charcoal/15 bg-white py-2 pl-9 pr-3 text-sm text-charcoal placeholder:text-charcoal/45 focus:border-navbar-bg/40 focus:outline-none focus:ring-2 focus:ring-navbar-bg/20"
                style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {(conversationsLoading || isResolvingStartConversation) && (
              <div className="flex h-full items-center justify-center">
                <div className="inline-flex items-center gap-2 text-sm text-charcoal/55" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading conversations...
                </div>
              </div>
            )}

            {!conversationsLoading && !isResolvingStartConversation && filteredConversations.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <MessageCircle className="mb-2 h-8 w-8 text-charcoal/25" />
                <p className="text-sm font-semibold text-charcoal/65" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  No conversations yet
                </p>
                <p className="mt-1 text-xs text-charcoal/45" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  Your inbox will appear here.
                </p>
              </div>
            )}

            {startConversationError && (
              <div className="mx-4 mt-4 rounded-xl border border-coral/25 bg-coral/10 px-3 py-2 text-xs text-coral">
                {startConversationError}
              </div>
            )}

            {!conversationsLoading && filteredConversations.length > 0 && (
              <ul className="divide-y divide-charcoal/8">
                {filteredConversations.map((conversation) => {
                  const isSelected = selectedConversationId === conversation.id;
                  const avatar = getConversationAvatar(conversation, role);
                  const name = getConversationTitle(conversation, role);
                  const subtitleValue = getConversationSubtitle(conversation, role);

                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectConversation(conversation.id)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors sm:px-5 ${
                          isSelected ? 'bg-card-bg/10' : 'hover:bg-charcoal/[0.03]'
                        }`}
                      >
                        <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-charcoal/10">
                          {avatar ? (
                            <Image
                              src={avatar}
                              alt={name}
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <MessageCircle className="h-5 w-5 text-charcoal/40" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                              {name}
                            </p>
                            <span className="text-xs text-charcoal/45" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                              {formatListTimestamp(conversation.last_message_at)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <p className="truncate text-xs text-charcoal/55" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                              {conversation.last_message_preview || subtitleValue}
                            </p>
                            {conversation.unread_count > 0 && (
                              <span className="inline-flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-coral px-1.5 text-[11px] font-bold text-white">
                                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className={`${threadPaneVisibleClass} min-w-0 flex-1 flex-col bg-off-white`}>
          {!selectedConversation && (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <MessageCircle className="mb-2 h-10 w-10 text-charcoal/20" />
              <p className="text-sm font-semibold text-charcoal/60" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                Select a conversation
              </p>
            </div>
          )}

          {selectedConversation && (
            <>
              <header className="sticky top-0 z-10 border-b border-charcoal/10 bg-off-white/95 px-4 py-3 backdrop-blur sm:px-5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileThreadOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-charcoal/12 text-charcoal/70 transition-colors hover:bg-charcoal/5 lg:hidden"
                    aria-label="Back to conversations"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl bg-charcoal/10">
                    {getConversationAvatar(selectedConversation, role) ? (
                      <Image
                        src={getConversationAvatar(selectedConversation, role) || ''}
                        alt={getConversationTitle(selectedConversation, role)}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <MessageCircle className="h-4 w-4 text-charcoal/40" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-charcoal" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                      {getConversationTitle(selectedConversation, role)}
                    </p>
                    <p className="truncate text-xs text-charcoal/50" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                      {getConversationSubtitle(selectedConversation, role)}
                    </p>
                  </div>
                </div>
              </header>

              <div ref={threadScrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                {messagesLoading && (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-charcoal/40" />
                  </div>
                )}

                {!messagesLoading && (
                  <>
                    {hasMore && (
                      <div className="mb-4 flex justify-center">
                        <button
                          type="button"
                          onClick={loadOlder}
                          disabled={isLoadingOlder}
                          className="inline-flex items-center gap-1 rounded-full border border-charcoal/15 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal/70 transition-colors hover:bg-charcoal/[0.03] disabled:opacity-60"
                          style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                        >
                          {isLoadingOlder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          Load earlier messages
                        </button>
                      </div>
                    )}

                    {messages.length === 0 && (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-charcoal/55" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                          Start the conversation.
                        </p>
                      </div>
                    )}

                    {messages.length > 0 && (
                      <div className="space-y-3">
                        {messages.map((message) => {
                          const ownMessage = message.sender_type === role;
                          const statusLabel = getStatusLabel(message);
                          const senderIdentity = resolveMessageIdentity(ownMessage);
                          const shouldAnimateMessage = animatedMessageIds.has(message.id);
                          const animationClassName = shouldAnimateMessage
                            ? prefersReducedMotion
                              ? 'message-bubble-enter-reduced'
                              : 'message-bubble-enter'
                            : '';

                          return (
                            <div
                              key={message.id}
                              className={`flex ${ownMessage ? 'justify-end' : 'justify-start'} ${animationClassName}`}
                            >
                              <div className={`flex items-end gap-2 ${ownMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                                <MessageBubbleAvatar name={senderIdentity.name} avatarUrl={senderIdentity.avatarUrl} />
                                <div
                                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 sm:max-w-[75%] ${
                                    ownMessage
                                      ? 'rounded-br-md bg-navbar-bg text-white shadow-sm'
                                      : 'rounded-bl-md border border-charcoal/10 bg-white text-charcoal shadow-sm'
                                  }`}
                                >
                                  <p
                                    className="whitespace-pre-wrap break-words text-sm"
                                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                                  >
                                    {message.body}
                                  </p>
                                  <div className={`mt-1.5 flex items-center gap-2 text-[11px] ${ownMessage ? 'text-white/70' : 'text-charcoal/45'}`}>
                                    <span>{formatThreadTimestamp(message.created_at)}</span>
                                    {ownMessage && (
                                      <>
                                        <span>{statusLabel}</span>
                                        {message.client_state === 'failed' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              void retryMessage(message);
                                            }}
                                            className="rounded-full border border-white/35 px-2 py-0.5 text-[10px] font-semibold text-white transition-colors hover:bg-white/15"
                                          >
                                            Retry
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="border-t border-charcoal/10 px-4 py-3 sm:px-5">
                <div className="flex items-end gap-2">
                  <textarea
                    value={composerValue}
                    onChange={(event) => setComposerValue(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    disabled={isSending}
                    placeholder="Type a message..."
                    rows={1}
                    className="min-h-[42px] max-h-[140px] flex-1 resize-y rounded-2xl border border-charcoal/15 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/45 focus:border-navbar-bg/35 focus:outline-none focus:ring-2 focus:ring-navbar-bg/20 disabled:opacity-70"
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={isSending || !composerValue.trim()}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-navbar-bg text-white shadow-[0_8px_20px_rgba(114,47,55,0.24)] transition-colors hover:bg-navbar-bg/90 disabled:cursor-not-allowed disabled:bg-charcoal/30"
                    aria-label="Send message"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
          </section>
        </div>
      </div>
      <style jsx>{`
        @keyframes messageBubbleEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes messageBubbleFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .message-bubble-enter {
          animation: messageBubbleEnter 190ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .message-bubble-enter-reduced {
          animation: messageBubbleFade 110ms ease-out both;
        }
      `}</style>
    </>
  );
}
