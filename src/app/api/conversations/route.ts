import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';
import {
  formatConversationListItem,
  getOwnedBusinessIds,
  isConversationSchemaDriftError,
  normalizeConversationRow,
  parseRole,
} from './_lib';

export const dynamic = 'force-dynamic';

const BUSINESS_RELATION_SELECT = `
  businesses (
    id,
    name,
    slug,
    image_url,
    category,
    verified
  )
`;

const CONVERSATION_SELECT_V2 = `
  id,
  user_id,
  owner_id,
  business_id,
  last_message_at,
  last_message_preview,
  user_unread_count,
  business_unread_count,
  created_at,
  ${BUSINESS_RELATION_SELECT}
`;

const CONVERSATION_SELECT_LEGACY = `
  id,
  user_id,
  owner_id,
  business_id,
  last_message_at,
  created_at,
  ${BUSINESS_RELATION_SELECT}
`;

const CONVERSATION_SELECT_MINIMAL = `
  id,
  user_id,
  owner_id,
  business_id,
  last_message_at,
  created_at
`;

interface ConversationSelectResult {
  data: any[];
  error: any;
  usedLegacy: boolean;
}

async function selectConversationsWithFallback(
  runSelect: (selectClause: string) => any
): Promise<ConversationSelectResult> {
  const modern = await runSelect(CONVERSATION_SELECT_V2);
  if (!modern.error) {
    return {
      data: (modern.data || []).map(normalizeConversationRow),
      error: null,
      usedLegacy: false,
    };
  }

  if (!isConversationSchemaDriftError(modern.error)) {
    return { data: [], error: modern.error, usedLegacy: false };
  }

  const legacy = await runSelect(CONVERSATION_SELECT_LEGACY);
  if (!legacy.error) {
    return {
      data: (legacy.data || []).map(normalizeConversationRow),
      error: null,
      usedLegacy: true,
    };
  }

  if (!isConversationSchemaDriftError(legacy.error)) {
    return { data: [], error: legacy.error, usedLegacy: true };
  }

  const minimal = await runSelect(CONVERSATION_SELECT_MINIMAL);
  if (minimal.error) {
    return { data: [], error: minimal.error, usedLegacy: true };
  }

  return {
    data: (minimal.data || []).map(normalizeConversationRow),
    error: null,
    usedLegacy: true,
  };
}

async function insertConversationWithFallback(
  supabase: any,
  modernPayload: Record<string, any>,
  legacyPayload: Record<string, any>
): Promise<{ data: any | null; error: any; usedLegacy: boolean }> {
  const modernInsert = await supabase
    .from('conversations')
    .insert(modernPayload)
    .select(CONVERSATION_SELECT_V2)
    .single();

  if (!modernInsert.error) {
    return {
      data: normalizeConversationRow(modernInsert.data),
      error: null,
      usedLegacy: false,
    };
  }

  if (!isConversationSchemaDriftError(modernInsert.error)) {
    return { data: null, error: modernInsert.error, usedLegacy: false };
  }

  const legacyInsert = await supabase
    .from('conversations')
    .insert(legacyPayload)
    .select(CONVERSATION_SELECT_LEGACY)
    .single();

  if (!legacyInsert.error) {
    return {
      data: normalizeConversationRow(legacyInsert.data),
      error: null,
      usedLegacy: true,
    };
  }

  if (!isConversationSchemaDriftError(legacyInsert.error)) {
    return { data: null, error: legacyInsert.error, usedLegacy: true };
  }

  const minimalInsert = await supabase
    .from('conversations')
    .insert(legacyPayload)
    .select(CONVERSATION_SELECT_MINIMAL)
    .single();

  if (minimalInsert.error) {
    return { data: null, error: minimalInsert.error, usedLegacy: true };
  }

  return {
    data: normalizeConversationRow(minimalInsert.data),
    error: null,
    usedLegacy: true,
  };
}

export const GET = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const { searchParams } = new URL(req.url);
    const role = parseRole(searchParams.get('role'));
    const requestedBusinessId = searchParams.get('business_id');

    if (role === 'user') {
      const { data: conversations, error } = await selectConversationsWithFallback((selectClause) =>
        supabase
          .from('conversations')
          .select(selectClause)
          .eq('user_id', user.id)
          .order('last_message_at', { ascending: false })
      );

      if (error) {
        console.error('[Conversations API] User list error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch conversations', details: error?.message || null },
          { status: 500 }
        );
      }

      // Enrich conversations that are missing their businesses join (MINIMAL schema fallback)
      const missingBusinessIds = (conversations || [])
        .filter((c: any) => c.business_id && !c.businesses)
        .map((c: any) => c.business_id as string);

      let enrichedConversations: any[] = conversations || [];

      if (missingBusinessIds.length > 0) {
        const { data: fetchedBusinesses } = await supabase
          .from('businesses')
          .select('id, name, slug, image_url, category, verified')
          .in('id', missingBusinessIds);

        if (fetchedBusinesses && fetchedBusinesses.length > 0) {
          const businessById = new Map(fetchedBusinesses.map((b: any) => [b.id, b]));
          enrichedConversations = enrichedConversations.map((c: any) =>
            c.business_id && !c.businesses && businessById.has(c.business_id)
              ? { ...c, businesses: businessById.get(c.business_id) }
              : c
          );
        }
      }

      const items = enrichedConversations.map((conversation: any) =>
        formatConversationListItem(conversation, 'user')
      );

      const unreadTotal = items.reduce((sum: number, item: any) => sum + Number(item.unread_count || 0), 0);

      return NextResponse.json({
        data: items,
        role: 'user',
        unread_total: unreadTotal,
      });
    }

    const ownedBusinessIds = await getOwnedBusinessIds(supabase, user.id);

    if (ownedBusinessIds.length === 0) {
      return NextResponse.json({
        data: [],
        role: 'business',
        unread_total: 0,
      });
    }

    if (requestedBusinessId && !ownedBusinessIds.includes(requestedBusinessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const scopedBusinessIds = requestedBusinessId
      ? [requestedBusinessId]
      : ownedBusinessIds;

    const { data: conversations, error } = await selectConversationsWithFallback((selectClause) =>
      supabase
        .from('conversations')
        .select(selectClause)
        .in('business_id', scopedBusinessIds)
        .order('last_message_at', { ascending: false })
    );

    if (error) {
      console.error('[Conversations API] Business list error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversations', details: error?.message || null },
        { status: 500 }
      );
    }

    const userIds = Array.from(new Set((conversations || []).map((conversation: any) => conversation.user_id).filter(Boolean)));

    let profilesByUserId = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, full_name, avatar_url')
        .in('user_id', userIds);

      if (profileError) {
        console.warn('[Conversations API] Failed to fetch participant profiles:', profileError);
      } else {
        profilesByUserId = new Map((profiles || []).map((profile: any) => [profile.user_id, profile]));
      }
    }

    const items = (conversations || []).map((conversation: any) =>
      formatConversationListItem(conversation, 'business', profilesByUserId.get(conversation.user_id))
    );

    const unreadTotal = items.reduce((sum: number, item: any) => sum + Number(item.unread_count || 0), 0);

    return NextResponse.json({
      data: items,
      role: 'business',
      unread_total: unreadTotal,
    });
  } catch (error: any) {
    console.error('[Conversations API] Unexpected list error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
});

export const POST = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const body = await req.json();
    const businessId = typeof body?.business_id === 'string' ? body.business_id : null;
    const requestedUserId = typeof body?.user_id === 'string' ? body.user_id : null;

    if (!businessId) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id, name')
      .eq('id', businessId)
      .maybeSingle();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const ownedBusinessIds = await getOwnedBusinessIds(supabase, user.id);
    const userOwnsBusiness = ownedBusinessIds.includes(businessId);

    const conversationUserId = requestedUserId || user.id;

    if (!requestedUserId && userOwnsBusiness) {
      return NextResponse.json(
        { error: 'Business owners must provide user_id when starting a customer conversation.' },
        { status: 400 }
      );
    }

    if (requestedUserId && !userOwnsBusiness) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (conversationUserId === business.owner_id) {
      return NextResponse.json({ error: 'Cannot create a conversation with yourself.' }, { status: 400 });
    }

    const { data: existingConversations, error: existingError } = await selectConversationsWithFallback((selectClause) =>
      supabase
        .from('conversations')
        .select(selectClause)
        .eq('user_id', conversationUserId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: true })
        .limit(1)
    );

    if (existingError) {
      console.error('[Conversations API] Existing conversation lookup failed:', existingError);
    }

    const existingConversation = existingConversations?.[0];

    if (existingConversation) {
      return NextResponse.json(
        {
          data: formatConversationListItem(
            existingConversation,
            conversationUserId === user.id ? 'user' : 'business'
          ),
          created: false,
        },
        { status: 200 }
      );
    }

    const modernInsertPayload: Record<string, any> = {
      user_id: conversationUserId,
      business_id: businessId,
      owner_id: business.owner_id || null,
      last_message_preview: '',
      last_message_at: new Date().toISOString(),
      user_unread_count: 0,
      business_unread_count: 0,
    };

    const legacyInsertPayload: Record<string, any> = {
      user_id: conversationUserId,
      business_id: businessId,
      owner_id: business.owner_id || null,
      last_message_at: new Date().toISOString(),
    };

    const {
      data: insertedConversation,
      error: insertError,
    } = await insertConversationWithFallback(supabase, modernInsertPayload, legacyInsertPayload);

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: fallbackConversations } = await selectConversationsWithFallback((selectClause) =>
          supabase
            .from('conversations')
            .select(selectClause)
            .eq('user_id', conversationUserId)
            .eq('business_id', businessId)
            .order('created_at', { ascending: true })
            .limit(1)
        );

        const fallbackConversation = fallbackConversations?.[0];
        if (fallbackConversation) {
          return NextResponse.json(
            {
              data: formatConversationListItem(
                fallbackConversation,
                conversationUserId === user.id ? 'user' : 'business'
              ),
              created: false,
            },
            { status: 200 }
          );
        }
      }

      console.error('[Conversations API] Create error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create conversation', details: insertError?.message || null },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: formatConversationListItem(
          insertedConversation,
          conversationUserId === user.id ? 'user' : 'business'
        ),
        created: true,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Conversations API] Unexpected create error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
});
