import type { PostgrestError } from '@supabase/supabase-js';

export type MessagingRole = 'user' | 'business';

export interface ConversationRow {
  id: string;
  user_id: string;
  owner_id?: string | null;
  business_id: string | null;
  last_message_at: string;
  last_message_preview?: string | null;
  user_unread_count?: number | null;
  business_unread_count?: number | null;
  created_at: string;
}

export interface ConversationAccessContext {
  conversation: ConversationRow;
  role: MessagingRole;
  ownedBusinessIds: string[];
}

export interface DecodedCursor {
  createdAt: string;
  id: string;
}

export function parseRole(value: string | null): MessagingRole {
  return value === 'business' ? 'business' : 'user';
}

export function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(value: string | null): DecodedCursor | null {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    const [createdAt, id] = decoded.split('|');
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export function isNotFoundError(error: PostgrestError | null | undefined): boolean {
  return error?.code === 'PGRST116';
}

export async function getOwnedBusinessIds(supabase: any, userId: string): Promise<string[]> {
  const [ownerLinksResult, ownedBusinessesResult] = await Promise.all([
    supabase
      .from('business_owners')
      .select('business_id')
      .eq('user_id', userId),
    supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', userId),
  ]);

  const ids = new Set<string>();

  for (const row of ownerLinksResult.data || []) {
    if (typeof row?.business_id === 'string') ids.add(row.business_id);
  }

  for (const row of ownedBusinessesResult.data || []) {
    if (typeof row?.id === 'string') ids.add(row.id);
  }

  return Array.from(ids);
}

export async function getConversationAccessContext(
  supabase: any,
  conversationId: string,
  userId: string
): Promise<ConversationAccessContext | null> {
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id, user_id, owner_id, business_id, last_message_at, last_message_preview, user_unread_count, business_unread_count, created_at')
    .eq('id', conversationId)
    .maybeSingle();

  if (error || !conversation) {
    return null;
  }

  if (conversation.user_id === userId) {
    return {
      conversation: conversation as ConversationRow,
      role: 'user',
      ownedBusinessIds: [],
    };
  }

  const ownedBusinessIds = await getOwnedBusinessIds(supabase, userId);

  const isBusinessParticipant =
    (conversation.business_id && ownedBusinessIds.includes(conversation.business_id)) ||
    conversation.owner_id === userId;

  if (!isBusinessParticipant) {
    return null;
  }

  return {
    conversation: conversation as ConversationRow,
    role: 'business',
    ownedBusinessIds,
  };
}

export function formatConversationListItem(conversation: any, role: MessagingRole, participantProfile?: any) {
  const unreadCount = role === 'business'
    ? Number(conversation.business_unread_count || 0)
    : Number(conversation.user_unread_count || 0);

  const business = Array.isArray(conversation.businesses)
    ? conversation.businesses[0]
    : conversation.businesses;

  return {
    id: conversation.id,
    user_id: conversation.user_id,
    owner_id: conversation.owner_id ?? null,
    business_id: conversation.business_id,
    last_message_at: conversation.last_message_at,
    last_message_preview: conversation.last_message_preview || '',
    unread_count: unreadCount,
    created_at: conversation.created_at,
    business: business
      ? {
          id: business.id,
          name: business.name,
          image_url: business.image_url,
          category: business.category,
          verified: business.verified,
          slug: business.slug,
        }
      : null,
    participant: role === 'business'
      ? {
          user_id: conversation.user_id,
          display_name:
            participantProfile?.display_name ||
            participantProfile?.username ||
            participantProfile?.full_name ||
            'Customer',
          username: participantProfile?.username || null,
          avatar_url: participantProfile?.avatar_url || null,
        }
      : null,
  };
}
