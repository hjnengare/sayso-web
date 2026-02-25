import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';
import { getConversationAccessContext } from '@/app/api/conversations/_lib';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withUser(async (_req: NextRequest, { user, supabase, params }) => {
  try {
    const { id: conversationId } = await (params as RouteContext['params']);

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const access = await getConversationAccessContext(supabase, conversationId, user.id);
    if (!access) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    const senderTypeToMarkRead = access.role === 'user' ? 'business' : 'user';
    const nowIso = new Date().toISOString();

    const { data: updatedRows, error: updateError } = await supabase
      .from('messages')
      .update({
        status: 'read',
        read: true,
        delivered_at: nowIso,
        read_at: nowIso,
      })
      .eq('conversation_id', conversationId)
      .eq('sender_type', senderTypeToMarkRead)
      .neq('status', 'read')
      .select('id');

    if (updateError) {
      console.error('[Conversation Read API] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
    }

    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, user_unread_count, business_unread_count')
      .eq('id', conversationId)
      .maybeSingle();

    return NextResponse.json({
      data: {
        conversation_id: conversationId,
        marked_count: (updatedRows || []).length,
        unread_count: access.role === 'user'
          ? Number(conversation?.user_unread_count || 0)
          : Number(conversation?.business_unread_count || 0),
      },
    });
  } catch (error: any) {
    console.error('[Conversation Read API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
});
