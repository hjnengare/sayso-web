import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { ReviewValidator } from '../../../lib/utils/validation';

// Simple text sanitization function (strips HTML tags and escapes special characters)
function sanitizeText(text: string): string {
  if (!text) return '';
  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  sanitized = sanitized
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  // Trim whitespace
  return sanitized.trim();
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/reviews/[id]
 * Get a single review by ID
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    
    // Check if user is authenticated (optional - reviews can be public)
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch the review with user profile and images
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
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // If user is authenticated and owns the review, return full data
    // Otherwise, return public data only
    if (user && review.user_id === user.id) {
      return NextResponse.json({
        review,
      });
    }

    // Return public review data
    return NextResponse.json({
      review: {
        id: review.id,
        business_id: review.business_id,
        rating: review.rating,
        title: review.title,
        content: review.content,
        tags: review.tags,
        helpful_count: review.helpful_count,
        created_at: review.created_at,
        updated_at: review.updated_at,
        profile: review.profile,
        review_images: review.review_images,
      },
    });

  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reviews/[id]
 * Edit a review
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to edit a review' },
        { status: 401 }
      );
    }

    // Check if review exists and user owns it
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, user_id, business_id')
      .eq('id', id)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    if (review.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own reviews' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { rating, title, content, tags } = body;

    // Get current review data to validate against
    const { data: currentReview } = await supabase
      .from('reviews')
      .select('rating, content, title, tags')
      .eq('id', id)
      .single();

    // Use provided values or fall back to current values for validation
    const ratingToValidate = rating !== undefined ? rating : currentReview?.rating;
    const contentToValidate = content !== undefined ? content : currentReview?.content;
    const titleToValidate = title !== undefined ? title : currentReview?.title;
    const tagsToValidate = tags !== undefined ? tags : currentReview?.tags || [];

    // Comprehensive validation using ReviewValidator
    const validationResult = ReviewValidator.validateReviewData({
      content: contentToValidate,
      title: titleToValidate,
      rating: ratingToValidate,
      tags: tagsToValidate,
    });

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.errors,
        },
        { status: 400 }
      );
    }

    // Sanitize content to prevent XSS
    const sanitizedContent = content !== undefined ? sanitizeText(content.trim()) : undefined;
    const sanitizedTitle = title !== undefined ? (title ? sanitizeText(title.trim()) : null) : undefined;

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (rating !== undefined) {
      updateData.rating = rating;
    }
    if (title !== undefined) {
      updateData.title = sanitizedTitle;
    }
    if (content !== undefined) {
      updateData.content = sanitizedContent;
    }
    if (tags !== undefined) {
      updateData.tags = tags;
    }

    // Update the review
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

    // Always recalculate business stats after review update (rating or content may affect stats)
    const { error: statsError } = await supabase.rpc('update_business_stats', {
      p_business_id: review.business_id
    });

    if (statsError) {
      console.error('Error updating business stats via RPC:', statsError);
      // Don't fail the request if stats update fails, but log it
    }

    return NextResponse.json({
      success: true,
      message: 'Review updated successfully',
      review: updatedReview,
    });

  } catch (error) {
    console.error('Error in edit review API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews/[id]
 * Delete a review
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to delete a review' },
        { status: 401 }
      );
    }

    // Check if review exists and user owns it
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, user_id, business_id')
      .eq('id', id)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    if (review.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own reviews' },
        { status: 403 }
      );
    }

    const businessId = review.business_id;

    // Get all review images before deletion
    const { data: reviewImages } = await supabase
      .from('review_images')
      .select('storage_path')
      .eq('review_id', id);

    // Delete images from storage
    if (reviewImages && reviewImages.length > 0) {
      const filePaths = reviewImages.map(img => img.storage_path);
      
      for (const filePath of filePaths) {
        const { error: deleteError } = await supabase.storage
          .from('review_images')
          .remove([filePath]);

        if (deleteError) {
          console.error('Error deleting review image from storage:', deleteError);
        }
      }
    }

    // Delete review images records (should cascade, but explicit delete is safer)
    const { error: imagesDeleteError } = await supabase
      .from('review_images')
      .delete()
      .eq('review_id', id);

    if (imagesDeleteError) {
      console.error('Error deleting review images:', imagesDeleteError);
    }

    // Delete helpful votes (should cascade, but explicit delete is safer)
    const { error: votesDeleteError } = await supabase
      .from('review_helpful_votes')
      .delete()
      .eq('review_id', id);

    if (votesDeleteError) {
      console.error('Error deleting helpful votes:', votesDeleteError);
    }

    // Delete the review
    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting review:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete review', details: deleteError.message },
        { status: 500 }
      );
    }

    // Update business stats
    const { error: statsError } = await supabase.rpc('update_business_stats', {
      p_business_id: businessId
    });

    if (statsError) {
      console.error('Error updating business stats via RPC:', statsError);
    }

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully',
    });

  } catch (error) {
    console.error('Error in delete review API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

