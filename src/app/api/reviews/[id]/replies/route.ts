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
  const { id } = await params;
  const reviewId = id;

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
  const { id } = await params;
  const reviewId = id;

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

    // Create notification for review owner (if not replying to own review)
    try {
      const { data: reviewOwner } = await supabase
        .from('reviews')
        .select('user_id, business_id')
        .eq('id', reviewId)
        .maybeSingle();

      if (reviewOwner && reviewOwner.user_id !== user.id) {
        const { data: businessData } = await supabase
          .from('businesses')
          .select('slug')
          .eq('id', reviewOwner.business_id)
          .maybeSingle();

        const replierName = profile?.display_name || profile?.username || 'Someone';
        
        await supabase.rpc('create_comment_reply_notification', {
          p_review_owner_id: reviewOwner.user_id,
          p_replier_id: user.id,
          p_review_id: reviewId,
          p_reply_id: reply.id,
          p_replier_name: replierName,
          p_business_slug: businessData?.slug || null
        });
      }
    } catch (notifError) {
      console.error('[Reply Create] Failed to create notification:', notifError);
      // Don't fail the request if notification fails
    }

    // Revalidate business page so reply shows immediately
    try {
      const { revalidatePath } = await import('next/cache');
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('business_id')
        .eq('id', reviewId)
        .maybeSingle();
      
      if (reviewData?.business_id) {
        const { data: businessRow } = await supabase
          .from('businesses')
          .select('id, slug')
          .eq('id', reviewData.business_id)
          .maybeSingle();
        
        if (businessRow) {
          const segment = businessRow.slug || businessRow.id;
          revalidatePath(`/business/${segment}`);
        }
      }
    } catch (revalErr) {
      console.warn('[Reply Create] Revalidation error:', revalErr);
    }

    return NextResponse.json({ reply: transformedReply }, { status: 201 });
  } catch (err) {
    console.error('POST /reviews/[id]/replies unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reviews/[id]/replies/[replyId]
 * Update a reply
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const reviewId = id;
  const { replyId, content } = await req.json();

  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to edit replies' },
        { status: 401 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Reply content is required' },
        { status: 400 }
      );
    }

    // Check if reply exists and belongs to user
    const { data: existingReply, error: checkError } = await supabase
      .from('review_replies')
      .select('user_id, review_id')
      .eq('id', replyId)
      .eq('review_id', reviewId)
      .single();

    if (checkError || !existingReply) {
      return NextResponse.json(
        { error: 'Reply not found' },
        { status: 404 }
      );
    }

    if (existingReply.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own replies' },
        { status: 403 }
      );
    }

    // Update reply
    const { data: reply, error: updateError } = await supabase
      .from('review_replies')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', replyId)
      .eq('user_id', user.id)
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

    if (updateError) {
      console.error('Error updating reply:', updateError);
      return NextResponse.json(
        { error: 'Failed to update reply' },
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

    // Revalidate business page so updated reply shows immediately
    try {
      const { revalidatePath } = await import('next/cache');
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('business_id')
        .eq('id', reviewId)
        .maybeSingle();
      
      if (reviewData?.business_id) {
        const { data: businessRow } = await supabase
          .from('businesses')
          .select('id, slug')
          .eq('id', reviewData.business_id)
          .maybeSingle();
        
        if (businessRow) {
          const segment = businessRow.slug || businessRow.id;
          revalidatePath(`/business/${segment}`);
        }
      }
    } catch (revalErr) {
      console.warn('[Reply Update] Revalidation error:', revalErr);
    }

    return NextResponse.json({ reply: transformedReply });
  } catch (err) {
    console.error('PUT /reviews/[id]/replies unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews/[id]/replies/[replyId]
 * Delete a reply
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const reviewId = id;
  const { replyId } = await req.json();

  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to delete replies' },
        { status: 401 }
      );
    }

    // Check if reply exists and belongs to user
    const { data: existingReply, error: checkError } = await supabase
      .from('review_replies')
      .select('user_id, review_id')
      .eq('id', replyId)
      .eq('review_id', reviewId)
      .single();

    if (checkError || !existingReply) {
      return NextResponse.json(
        { error: 'Reply not found' },
        { status: 404 }
      );
    }

    if (existingReply.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own replies' },
        { status: 403 }
      );
    }

    // Delete reply
    const { error: deleteError } = await supabase
      .from('review_replies')
      .delete()
      .eq('id', replyId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting reply:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete reply' },
        { status: 500 }
      );
    }

    // Revalidate business page so deleted reply disappears immediately
    try {
      const { revalidatePath } = await import('next/cache');
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('business_id')
        .eq('id', reviewId)
        .maybeSingle();
      
      if (reviewData?.business_id) {
        const { data: businessRow } = await supabase
          .from('businesses')
          .select('id, slug')
          .eq('id', reviewData.business_id)
          .maybeSingle();
        
        if (businessRow) {
          const segment = businessRow.slug || businessRow.id;
          revalidatePath(`/business/${segment}`);
        }
      }
    } catch (revalErr) {
      console.warn('[Reply Delete] Revalidation error:', revalErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /reviews/[id]/replies unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}

