import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabase/server';

type RouteContext = {
  params: { id: string };
};

/**
 * GET /api/reviews/[id]/replies
 * Get all replies for a review
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const reviewId = params.id;

  try {
    const supabase = await getServerSupabase();

    const { data, error } = await supabase
      .from('review_replies')
      .select(`
        *,
        profile:profiles!review_replies_user_id_fkey (
          user_id,
          display_name,
          username,
          avatar_url
        )
      `)
      .eq('review_id', reviewId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching replies:', error);
      return NextResponse.json(
        { error: 'Failed to fetch replies' },
        { status: 500 }
      );
    }

    // Transform replies to match frontend structure
    const transformedReplies = (data || []).map((reply: any) => {
      const profile = Array.isArray(reply.profile) ? reply.profile[0] : reply.profile;
      return {
        id: reply.id,
        review_id: reply.review_id,
        user_id: reply.user_id,
        content: reply.content,
        created_at: reply.created_at,
        updated_at: reply.updated_at,
        user: {
          id: profile?.user_id || reply.user_id,
          name: profile?.display_name || profile?.username || 'User',
          avatar_url: profile?.avatar_url,
        },
      };
    });

    return NextResponse.json({ replies: transformedReplies });
  } catch (err) {
    console.error('GET /reviews/[id]/replies unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews/[id]/replies
 * Create a reply to a review
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const reviewId = params.id;

  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to reply' },
        { status: 401 }
      );
    }

    const { content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Reply content is required' },
        { status: 400 }
      );
    }

    // Check if review exists
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Create reply
    const { data: reply, error: insertError } = await supabase
      .from('review_replies')
      .insert({
        review_id: reviewId,
        user_id: user.id,
        content: content.trim(),
      })
      .select(`
        *,
        profile:profiles!review_replies_user_id_fkey (
          user_id,
          display_name,
          username,
          avatar_url
        )
      `)
      .single();

    if (insertError) {
      console.error('Error creating reply:', insertError);
      return NextResponse.json(
        { error: 'Failed to create reply' },
        { status: 500 }
      );
    }

    // Transform reply to match frontend structure
    const profile = Array.isArray(reply.profile) ? reply.profile[0] : reply.profile;
    const transformedReply = {
      id: reply.id,
      review_id: reply.review_id,
      user_id: reply.user_id,
      content: reply.content,
      created_at: reply.created_at,
      updated_at: reply.updated_at,
      user: {
        id: profile?.user_id || reply.user_id,
        name: profile?.display_name || profile?.username || 'User',
        avatar_url: profile?.avatar_url,
      },
    };

    return NextResponse.json({ reply: transformedReply }, { status: 201 });
  } catch (err) {
    console.error('POST /reviews/[id]/replies unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}

