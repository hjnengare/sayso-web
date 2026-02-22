import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/reviews/[id]/reply
 * Create or update an owner reply to a review — requires auth
 */
export const POST = withUser(async (req: NextRequest, { user, supabase, params }) => {
  try {
    const { id: reviewId } = await (params as RouteContext['params']);

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
    }

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, business_id')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const { data: ownership, error: ownershipError } = await supabase
      .from('business_owners')
      .select('id')
      .eq('business_id', review.business_id)
      .eq('user_id', user.id)
      .single();

    if (ownershipError || !ownership) {
      return NextResponse.json({ error: 'You do not have permission to reply to this review' }, { status: 403 });
    }

    const { data: existingReply, error: existingError } = await supabase
      .from('review_replies')
      .select('id')
      .eq('review_id', reviewId)
      .single();

    let reply;
    if (existingReply) {
      const { data, error } = await supabase
        .from('review_replies')
        .update({ content: content.trim(), updated_at: new Date().toISOString() })
        .eq('id', existingReply.id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) {
        console.error('Error updating reply:', error);
        return NextResponse.json({ error: 'Failed to update reply' }, { status: 500 });
      }
      reply = data;
    } else {
      const { data, error } = await supabase
        .from('review_replies')
        .insert({ review_id: reviewId, user_id: user.id, content: content.trim() })
        .select()
        .single();
      if (error) {
        console.error('Error creating reply:', error);
        return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
      }
      reply = data;
    }

    return NextResponse.json({ reply }, { status: existingReply ? 200 : 201 });
  } catch (error) {
    console.error('Error in POST /api/reviews/[id]/reply:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/**
 * DELETE /api/reviews/[id]/reply
 * Delete an owner reply to a review — requires auth
 */
export const DELETE = withUser(async (_req: NextRequest, { user, supabase, params }) => {
  try {
    const { id: reviewId } = await (params as RouteContext['params']);

    const { data: reply, error: replyError } = await supabase
      .from('review_replies')
      .select('id, user_id')
      .eq('review_id', reviewId)
      .single();

    if (replyError || !reply) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    }

    if (reply.user_id !== user.id) {
      return NextResponse.json({ error: 'You do not have permission to delete this reply' }, { status: 403 });
    }

    const { error: deleteError } = await supabase.from('review_replies').delete().eq('id', reply.id);
    if (deleteError) {
      console.error('Error deleting reply:', deleteError);
      return NextResponse.json({ error: 'Failed to delete reply' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/reviews/[id]/reply:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
