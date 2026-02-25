import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';
import {
  formatConversationListItem,
  getOwnedBusinessIds,
  parseRole,
} from './_lib';

export const dynamic = 'force-dynamic';

const CONVERSATION_SELECT = `
  id,
  user_id,
  owner_id,
  business_id,
  last_message_at,
  last_message_preview,
  user_unread_count,
  business_unread_count,
  created_at,
  businesses (
    id,
    name,
    slug,
    image_url,
    category,
    verified
  )
`;

export const GET = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const { searchParams } = new URL(req.url);
    const role = parseRole(searchParams.get('role'));
    const requestedBusinessId = searchParams.get('business_id');

    if (role === 'user') {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(CONVERSATION_SELECT)
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('[Conversations API] User list error:', error);
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
      }

      const items = (conversations || []).map((conversation: any) =>
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

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .in('business_id', scopedBusinessIds)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('[Conversations API] Business list error:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
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

    const { data: existingConversations, error: existingError } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .eq('user_id', conversationUserId)
      .eq('business_id', businessId)
      .order('created_at', { ascending: true })
      .limit(1);

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

    const insertPayload: Record<string, any> = {
      user_id: conversationUserId,
      business_id: businessId,
      owner_id: business.owner_id || null,
      last_message_preview: '',
      last_message_at: new Date().toISOString(),
      user_unread_count: 0,
      business_unread_count: 0,
    };

    const { data: insertedConversation, error: insertError } = await supabase
      .from('conversations')
      .insert(insertPayload)
      .select(CONVERSATION_SELECT)
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: fallbackConversations } = await supabase
          .from('conversations')
          .select(CONVERSATION_SELECT)
          .eq('user_id', conversationUserId)
          .eq('business_id', businessId)
          .order('created_at', { ascending: true })
          .limit(1);

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
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
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
