import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

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
export const GET = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    // Get businessId from query params (for owner filtering)
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');

    // Build query - filter by business if provided
    let query = supabase
      .from('conversations')
      .select(`
        id,
        owner_id,
        business_id,
        last_message_at,
        created_at,
        businesses (
          id,
          name,
          image_url,
          category,
          verified
        )
      `)
      .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`);

    // If businessId is provided, filter by it (for owners viewing their business conversations)
    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    // Get conversations where user is either the user or owner
    // First try with relationships, if that fails, fetch businesses separately
    let { data: conversations, error: conversationsError } = await query
      .order('last_message_at', { ascending: false });

    // If the relationship query fails, try without it
    if (conversationsError && conversationsError.code === 'PGRST116') {
      // Table might not exist, return empty array
      conversations = [];
      conversationsError = null;
    } else if (conversationsError) {
      // Try a simpler query without relationships
      const simpleQuery = await supabase
        .from('conversations')
        .select('id, owner_id, business_id, last_message_at, created_at')
        .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });
      
      if (!simpleQuery.error && simpleQuery.data) {
        // Add businesses property as null/empty for type compatibility
        conversations = simpleQuery.data.map((conv: any) => ({
          ...conv,
          businesses: null,
        }));
        conversationsError = null;
      }
    }

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      console.error('Error code:', conversationsError.code);
      console.error('Error details:', conversationsError.details);
      return NextResponse.json(
        { 
          error: 'Failed to fetch conversations', 
          details: conversationsError.message,
          code: conversationsError.code,
          hint: conversationsError.hint
        },
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
        // Supabase returns it as 'businesses' when using the table name directly
        let businessData: any = null;
        if ('businesses' in conv) {
          businessData = Array.isArray(conv.businesses) 
            ? conv.businesses[0] 
            : conv.businesses;
        }
        
        // If business data not in relation, fetch it separately
        if (!businessData && conv.business_id) {
          const { data: business } = await supabase
            .from('businesses')
            .select('id, name, image_url, category, verified')
            .eq('id', conv.business_id)
            .single();
          businessData = business;
        }
        
        // Handle owner_profile relation (may be array or object)
        // Fetch profile separately if not in relation
        let ownerProfileData: any = null;
        if ('profiles' in conv) {
          ownerProfileData = Array.isArray(conv.profiles)
            ? conv.profiles[0]
            : conv.profiles;
        }
        
        if (!ownerProfileData && conv.owner_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .eq('user_id', conv.owner_id)
            .single();
          ownerProfileData = profile;
        }

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
            user_id: ownerProfileData.user_id || ownerProfileData.id,
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
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
});

/**
 * POST /api/messages/conversations
 * Create a new conversation or get existing one
 * Body: { owner_id: string, business_id?: string }
 */
export const POST = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const body = await req.json();
    const { owner_id, user_id: target_user_id, business_id } = body;

    if (!owner_id && !target_user_id) {
      return NextResponse.json(
        { error: 'Either owner_id or user_id is required' },
        { status: 400 }
      );
    }

    // Determine conversation participants based on who is initiating:
    // - owner_id provided → current user is the customer messaging a business owner
    // - user_id provided → current user is the business owner messaging a customer
    const conversationUserId = owner_id ? user.id : target_user_id;
    const conversationOwnerId = owner_id ? owner_id : user.id;

    // Check if conversation already exists
    const { data: existingConversation, error: existingError } = await supabase
      .from('conversations')
      .select(`
        *,
        businesses (
          id,
          name,
          image_url,
          category,
          verified
        )
      `)
      .eq('user_id', conversationUserId)
      .eq('owner_id', conversationOwnerId)
      .single();
    
    // If error is "not found" (PGRST116), that's fine - we'll create a new one
    // Otherwise, log the error
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking for existing conversation:', existingError);
    }

    if (existingConversation && !existingError) {
      // Handle business relation (may be array or object)
      const businessData = Array.isArray(existingConversation.businesses) 
        ? existingConversation.businesses[0] 
        : existingConversation.businesses;
      
      return NextResponse.json({
        data: {
          ...existingConversation,
          business: businessData || null,
        },
        error: null,
      });
    }

    // If business_id not provided, try to find it from the owner
    let finalBusinessId = business_id;
    if (!finalBusinessId) {
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', conversationOwnerId)
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
        user_id: conversationUserId,
        owner_id: conversationOwnerId,
        business_id: finalBusinessId || null,
      })
      .select('*')
      .single();

    if (createError) {
      console.error('Error creating conversation:', createError);
      console.error('Error code:', createError.code);
      console.error('Error details:', createError.details);
      console.error('Error hint:', createError.hint);
      return NextResponse.json(
        { 
          error: 'Failed to create conversation', 
          details: createError.message,
          code: createError.code,
          hint: createError.hint
        },
        { status: 500 }
      );
    }

    // Fetch business data separately if business_id exists
    let businessData = null;
    if (newConversation.business_id) {
      const { data: business } = await supabase
        .from('businesses')
        .select('id, name, image_url, category, verified')
        .eq('id', newConversation.business_id)
        .single();
      businessData = business;
    }

    return NextResponse.json({
      data: {
        ...newConversation,
        business: businessData,
      },
      error: null,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in create conversation API:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
});

