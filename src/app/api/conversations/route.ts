import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conversations
 * Get all conversations for the authenticated user
 */
export async function GET(req: Request) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch conversations where user is either the user or owner
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        user_id,
        owner_id,
        business_id,
        last_message_at,
        created_at,
        businesses (
          id,
          name,
          slug,
          image_url
        ),
        messages (
          id,
          content,
          sender_id,
          read,
          created_at
        )
      `)
      .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('[Conversations API] Error fetching conversations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    // Get profiles for all participants
    const participantIds = new Set<string>();
    conversations?.forEach(conv => {
      participantIds.add(conv.user_id);
      participantIds.add(conv.owner_id);
    });

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url, full_name')
      .in('user_id', Array.from(participantIds));

    const profilesMap = new Map(
      profiles?.map(p => [p.user_id, p]) || []
    );

    // Transform conversations
    const transformedConversations = conversations?.map(conv => {
      const isUserSender = conv.user_id === user.id;
      const otherParticipantId = isUserSender ? conv.owner_id : conv.user_id;
      const otherParticipant = profilesMap.get(otherParticipantId);

      // Get last message
      const lastMessage = conv.messages?.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      // Count unread messages
      const unreadCount = conv.messages?.filter((msg: any) =>
        msg.sender_id !== user.id && !msg.read
      ).length || 0;

      return {
        id: conv.id,
        business: conv.businesses,
        otherParticipant: {
          id: otherParticipantId,
          username: otherParticipant?.username,
          avatar_url: otherParticipant?.avatar_url,
          full_name: otherParticipant?.full_name,
        },
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          sender_id: lastMessage.sender_id,
          created_at: lastMessage.created_at,
          isOwnMessage: lastMessage.sender_id === user.id,
        } : null,
        unreadCount,
        last_message_at: conv.last_message_at,
        created_at: conv.created_at,
      };
    });

    return NextResponse.json({
      conversations: transformedConversations,
      success: true,
    });
  } catch (error: any) {
    console.error('[Conversations API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations
 * Create a new conversation between user and business owner
 */
export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { business_id, message } = body;

    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      );
    }

    // Get business owner
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id, name')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check if user is trying to message themselves
    if (business.owner_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot create conversation with yourself' },
        { status: 400 }
      );
    }

    // Check if conversation already exists
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)
      .eq('owner_id', business.owner_id)
      .single();

    if (existingConv) {
      // Return existing conversation
      return NextResponse.json({
        conversation: { id: existingConv.id },
        success: true,
        message: 'Conversation already exists',
      });
    }

    // Create new conversation
    const { data: newConversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        owner_id: business.owner_id,
        business_id: business.id,
      })
      .select()
      .single();

    if (convError) {
      console.error('[Conversations API] Error creating conversation:', convError);
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    // If initial message provided, create it
    if (message && message.trim()) {
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: newConversation.id,
          sender_id: user.id,
          content: message.trim(),
        });

      if (msgError) {
        console.error('[Conversations API] Error creating initial message:', msgError);
      }
    }

    return NextResponse.json({
      conversation: newConversation,
      success: true,
      message: 'Conversation created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Conversations API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
