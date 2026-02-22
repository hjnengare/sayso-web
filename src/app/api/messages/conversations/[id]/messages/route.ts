import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/messages/conversations/[id]/messages
 * Send a message in a conversation
 * Body: { content: string }
 */
export const POST = withUser(async (req: NextRequest, { user, supabase, params }) => {
  try {
    const { id: conversationId } = await (params as RouteContext['params']);

    if (!conversationId || conversationId.trim() === '') {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
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

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        read: false,
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json(
        { error: 'Failed to send message', details: messageError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: message, error: null }, { status: 201 });
  } catch (error: any) {
    console.error('Error in send message API:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
});
