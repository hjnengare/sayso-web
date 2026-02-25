import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';
import {
  decodeCursor,
  encodeCursor,
  getConversationAccessContext,
  parsePositiveInt,
} from '@/app/api/conversations/_lib';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withUser(async (req: NextRequest, { user, supabase, params }) => {
  try {
    const { id: conversationId } = await (params as RouteContext['params']);

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const access = await getConversationAccessContext(supabase, conversationId, user.id);
    if (!access) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    const incomingSenderType = access.role === 'user' ? 'business' : 'user';
    const nowIso = new Date().toISOString();
    await supabase
      .from('messages')
      .update({
        status: 'delivered',
        delivered_at: nowIso,
      })
      .eq('conversation_id', conversationId)
      .eq('sender_type', incomingSenderType)
      .eq('status', 'sent');

    const { searchParams } = new URL(req.url);
    const limit = parsePositiveInt(searchParams.get('limit'), 30, 60);
    const cursor = decodeCursor(searchParams.get('cursor'));

    let query = supabase
      .from('messages')
      .select('id, conversation_id, body, content, status, sender_type, sender_user_id, sender_business_id, created_at, delivered_at, read_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
      );
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('[Conversation Messages API] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    const fetchedRows = rows || [];
    const hasMore = fetchedRows.length > limit;
    const pageRows = hasMore ? fetchedRows.slice(0, limit) : fetchedRows;
    const orderedRows = [...pageRows].reverse();

    const nextCursor = hasMore
      ? encodeCursor(pageRows[pageRows.length - 1].created_at, pageRows[pageRows.length - 1].id)
      : null;

    const messages = orderedRows.map((row: any) => ({
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
    }));

    return NextResponse.json({
      data: {
        conversation_id: conversationId,
        messages,
        has_more: hasMore,
        next_cursor: nextCursor,
      },
    });
  } catch (error: any) {
    console.error('[Conversation Messages API] Unexpected fetch error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
});

export const POST = withUser(async (req: NextRequest, { user, supabase, params }) => {
  try {
    const { id: conversationId } = await (params as RouteContext['params']);

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const access = await getConversationAccessContext(supabase, conversationId, user.id);
    if (!access) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    const body = await req.json();
    const text = typeof body?.body === 'string'
      ? body.body
      : typeof body?.message === 'string'
        ? body.message
        : '';

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
    }

    const senderType = access.role === 'user' ? 'user' : 'business';

    const insertPayload: Record<string, any> = {
      conversation_id: conversationId,
      body: text.trim(),
      sender_type: senderType,
      sender_user_id: user.id,
      sender_business_id: senderType === 'business' ? access.conversation.business_id : null,
      status: 'sent',
    };

    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select('id, conversation_id, body, content, status, sender_type, sender_user_id, sender_business_id, created_at, delivered_at, read_at')
      .single();

    if (insertError || !message) {
      console.error('[Conversation Messages API] Send error:', insertError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json(
      {
        data: {
          id: message.id,
          conversation_id: message.conversation_id,
          body: message.body || message.content || '',
          status: message.status || 'sent',
          sender_type: message.sender_type,
          sender_user_id: message.sender_user_id,
          sender_business_id: message.sender_business_id,
          created_at: message.created_at,
          delivered_at: message.delivered_at,
          read_at: message.read_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Conversation Messages API] Unexpected send error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
});
