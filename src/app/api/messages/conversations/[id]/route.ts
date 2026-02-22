import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/messages/conversations/[id]
 * Get all messages in a conversation
 */
export const GET = withUser(async (_req: NextRequest, { user, supabase, params }) => {
  try {
    const { id: conversationId } = await (params as RouteContext['params']);

    if (!conversationId || conversationId.trim() === '') {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, sender_id, content, read, created_at, updated_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: messagesError.message },
        { status: 500 }
      );
    }

    const otherPartyId = conversation.user_id === user.id
      ? conversation.owner_id
      : conversation.user_id;

    if (messages && messages.length > 0) {
      const unreadMessages = messages.filter(
        msg => msg.sender_id === otherPartyId && !msg.read
      );
      if (unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ read: true })
          .in('id', unreadMessages.map(m => m.id));
      }
    }

    return NextResponse.json({ data: { conversation, messages: messages || [] }, error: null });
  } catch (error: any) {
    console.error('Error in get messages API:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
});
