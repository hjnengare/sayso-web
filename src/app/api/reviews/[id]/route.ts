import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { withUser } from '@/app/api/_lib/withAuth';
import { ReviewValidator } from '../../../lib/utils/validation';

function sanitizeText(text: string): string {
  if (!text) return '';
  let sanitized = text.replace(/<[^>]*>/g, '');
  sanitized = sanitized
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  return sanitized.trim();
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/reviews/[id]
 * Public — no auth required
 */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select(`
        *,
        profile:profiles!reviews_user_id_fkey (
          user_id,
          display_name,
          avatar_url,
          username
        ),
        review_images (
          id,
          image_url,
          alt_text,
          storage_path
        )
      `)
      .eq('id', id)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (user && review.user_id === user.id) {
      return NextResponse.json({ review });
    }

    const profile = Array.isArray(review.profile) ? review.profile[0] : review.profile;
    const userId = profile?.user_id ?? review.user_id;
    const displayName = userId == null
      ? 'Anonymous'
      : (profile?.display_name || profile?.username || 'Anonymous');

    return NextResponse.json({
      review: {
        ...review,
        user: {
          id: userId,
          name: displayName,
          username: profile?.username ?? null,
          display_name: userId == null ? 'Anonymous' : (profile?.display_name ?? null),
          avatar_url: profile?.avatar_url ?? null,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/reviews/[id]
 * Edit a review — requires auth
 */
export const PUT = withUser(async (req: NextRequest, { user, supabase, params }) => {
  try {
    const { id } = await (params as RouteContext['params']);

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, user_id, business_id')
      .eq('id', id)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own reviews' }, { status: 403 });
    }

    const body = await req.json();
    const { rating, title, content, tags } = body;

    const { data: currentReview } = await supabase
      .from('reviews')
      .select('rating, content, title, tags')
      .eq('id', id)
      .single();

    const ratingToValidate = rating !== undefined ? rating : currentReview?.rating;
    const contentToValidate = content !== undefined ? content : currentReview?.content;
    const titleToValidate = title !== undefined ? title : currentReview?.title;
    const tagsToValidate = tags !== undefined ? tags : currentReview?.tags || [];

    const validationResult = ReviewValidator.validateReviewData({
      content: contentToValidate,
      title: titleToValidate,
      rating: ratingToValidate,
      tags: tagsToValidate,
    });

    if (!validationResult.isValid) {
      return NextResponse.json({ error: 'Validation failed', details: validationResult.errors }, { status: 400 });
    }

    const sanitizedContent = content !== undefined ? sanitizeText(content.trim()) : undefined;
    const sanitizedTitle = title !== undefined ? (title ? sanitizeText(title.trim()) : null) : undefined;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (rating !== undefined) updateData.rating = rating;
    if (title !== undefined) updateData.title = sanitizedTitle;
    if (content !== undefined) updateData.content = sanitizedContent;
    if (tags !== undefined) updateData.tags = tags;

    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        profile:profiles!reviews_user_id_fkey (
          user_id,
          display_name,
          avatar_url
        ),
        review_images (
          id,
          image_url,
          alt_text
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating review:', updateError);
      return NextResponse.json(
        { error: 'Failed to update review', details: updateError.message },
        { status: 500 }
      );
    }

    const { error: statsError } = await supabase.rpc('update_business_stats', { p_business_id: review.business_id });
    if (statsError) console.error('Error updating business stats via RPC:', statsError);

    try {
      const { revalidatePath } = await import('next/cache');
      const { data: businessRow } = await supabase
        .from('businesses')
        .select('id, slug')
        .eq('id', review.business_id)
        .maybeSingle();
      if (businessRow) {
        const segment = businessRow.slug || businessRow.id;
        revalidatePath(`/business/${segment}`);
        if (businessRow.slug && businessRow.slug !== businessRow.id) {
          revalidatePath(`/business/${businessRow.id}`);
        }
      }
      revalidatePath('/profile');
    } catch (revalErr) {
      console.warn('[Review Edit] Revalidation error:', revalErr);
    }

    fetch(`${req.headers.get('origin') || 'http://localhost:3000'}/api/badges/check-and-award`, {
      method: 'POST',
      headers: { Cookie: req.headers.get('cookie') || '', 'Content-Type': 'application/json' },
    }).catch((err) => { console.warn('[Review Edit] Error triggering badge check:', err); });

    return NextResponse.json({ success: true, message: 'Review updated successfully', review: updatedReview });
  } catch (error) {
    console.error('Error in edit review API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/**
 * DELETE /api/reviews/[id]
 * Delete a review — requires auth
 */
export const DELETE = withUser(async (req: NextRequest, { user, supabase, params }) => {
  try {
    const { id } = await (params as RouteContext['params']);
    console.log('[/api/reviews] DELETE request:', { id });

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, user_id, business_id')
      .eq('id', id)
      .single();

    if (reviewError) {
      console.error('[/api/reviews] DELETE review fetch error:', reviewError);
      return NextResponse.json({ error: 'Review not found', details: reviewError.message }, { status: 404 });
    }

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own reviews' }, { status: 403 });
    }

    const businessId = review.business_id;

    const { data: reviewImages } = await supabase
      .from('review_images')
      .select('storage_path')
      .eq('review_id', id);

    const storagePaths = (reviewImages ?? [])
      .map((img) => img?.storage_path)
      .filter((path): path is string => Boolean(path));

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage.from('review_images').remove(storagePaths);
      if (storageError) console.error('Error deleting review images from storage (continuing with DB deletion):', storageError);
    }

    const { error: imagesDeleteError } = await supabase.from('review_images').delete().eq('review_id', id);
    if (imagesDeleteError) console.error('Error deleting review images:', imagesDeleteError);

    const { error: votesDeleteError } = await supabase.from('review_helpful_votes').delete().eq('review_id', id);
    if (votesDeleteError) console.error('Error deleting helpful votes:', votesDeleteError);

    const { error: deleteError } = await supabase.from('reviews').delete().eq('id', id);
    if (deleteError) {
      console.error('[/api/reviews] DELETE error deleting review:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete review', details: deleteError.message, code: deleteError.code },
        { status: 500 }
      );
    }

    console.log('[/api/reviews] DELETE review deleted successfully:', { id, business_id: businessId });

    const { error: statsError } = await supabase.rpc('update_business_stats', { p_business_id: businessId });
    if (statsError) console.error('[/api/reviews] DELETE error updating business stats:', statsError);

    try {
      const { revalidatePath } = await import('next/cache');
      const { invalidateBusinessCache } = await import('../../../lib/utils/optimizedQueries');
      const { data: businessRow } = await supabase
        .from('businesses')
        .select('id, slug')
        .eq('id', businessId)
        .maybeSingle();
      if (businessRow) {
        invalidateBusinessCache(businessRow.id, businessRow.slug ?? undefined);
        const segment = businessRow.slug || businessRow.id;
        revalidatePath(`/business/${segment}`);
        if (businessRow.slug && businessRow.slug !== businessRow.id) {
          revalidatePath(`/business/${businessRow.id}`);
        }
      }
      revalidatePath('/profile');
    } catch (revalErr) {
      console.warn('[Review Delete] Revalidation error:', revalErr);
    }

    fetch(`${req.headers.get('origin') || 'http://localhost:3000'}/api/badges/check-and-award`, {
      method: 'POST',
      headers: { Cookie: req.headers.get('cookie') || '', 'Content-Type': 'application/json' },
    }).catch(err => { console.warn('[Review Delete] Error triggering badge check:', err); });

    return NextResponse.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('[/api/reviews] DELETE unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
});
