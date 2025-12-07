import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface ConversationWithBusiness {
  id: string;
  owner_id: string;
  business_id: string | null;
  last_message_at: string;
  created_at: string;
  business: {
    id: string;
    name: string;
    image_url: string | null;
    category: string;
    verified: boolean;
  } | null;
  owner_profile: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  last_message: {
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
  unread_count: number;
}

/**
 * GET /api/messages/conversations
 * Get all conversations for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get conversations where user is either the user or owner
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        id,
        owner_id,
        business_id,
        last_message_at,
        created_at,
        business:businesses!conversations_business_id_fkey (
          id,
          name,
          image_url,
          category,
          verified
        ),
        owner_profile:profiles!conversations_owner_id_fkey (
          user_id,
          display_name,
          avatar_url
        )
      `)
      .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return NextResponse.json(
        { error: 'Failed to fetch conversations', details: conversationsError.message },
        { status: 500 }
      );
    }

    // For each conversation, get the last message and unread count
    const conversationsWithDetails: ConversationWithBusiness[] = await Promise.all(
      (conversations || []).map(async (conv) => {
        // Get last message
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('content, created_at, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get unread count (messages not sent by current user and not read)
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('read', false)
          .neq('sender_id', user.id);

        // Handle business relation (may be array or object)
        const businessData = Array.isArray(conv.business) 
          ? conv.business[0] 
          : conv.business;
        
        // Handle owner_profile relation (may be array or object)
        const ownerProfileData = Array.isArray(conv.owner_profile)
          ? conv.owner_profile[0]
          : conv.owner_profile;

        return {
          id: conv.id,
          owner_id: conv.owner_id,
          business_id: conv.business_id,
          last_message_at: conv.last_message_at,
          created_at: conv.created_at,
          business: businessData ? {
            id: businessData.id,
            name: businessData.name,
            image_url: businessData.image_url,
            category: businessData.category,
            verified: businessData.verified,
          } : null,
          owner_profile: ownerProfileData ? {
            user_id: ownerProfileData.user_id,
            display_name: ownerProfileData.display_name,
            avatar_url: ownerProfileData.avatar_url,
          } : null,
          last_message: lastMessage ? {
            content: lastMessage.content,
            created_at: lastMessage.created_at,
            sender_id: lastMessage.sender_id,
          } : null,
          unread_count: unreadCount || 0,
        };
      })
    );

    return NextResponse.json({
      data: conversationsWithDetails,
      error: null,
    });
  } catch (error: any) {
    console.error('Error in conversations API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages/conversations
 * Create a new conversation or get existing one
 * Body: { owner_id: string, business_id?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { owner_id, business_id } = body;

    if (!owner_id) {
      return NextResponse.json(
        { error: 'owner_id is required' },
        { status: 400 }
      );
    }

    // Check if conversation already exists
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select(`
        *,
        business:businesses!conversations_business_id_fkey (
          id,
          name,
          image_url,
          category,
          verified
        )
      `)
      .eq('user_id', user.id)
      .eq('owner_id', owner_id)
      .single();

    if (existingConversation) {
      return NextResponse.json({
        data: existingConversation,
        error: null,
      });
    }

    // If business_id not provided, try to find it from owner_id
    let finalBusinessId = business_id;
    if (!finalBusinessId) {
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', owner_id)
        .limit(1)
        .single();
      if (business) {
        finalBusinessId = business.id;
      }
    }

    // Create new conversation
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        owner_id,
        business_id: finalBusinessId || null,
      })
      .select(`
        *,
        business:businesses!conversations_business_id_fkey (
          id,
          name,
          image_url,
          category,
          verified
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating conversation:', createError);
      return NextResponse.json(
        { error: 'Failed to create conversation', details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: newConversation,
      error: null,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in create conversation API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

