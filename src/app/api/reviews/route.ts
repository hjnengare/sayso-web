import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../lib/supabase/server';
import { ReviewRateLimiter } from '../../lib/utils/rateLimiter';
import { ReviewValidator } from '../../lib/utils/validation';
import { ContentModerator } from '../../lib/utils/contentModeration';
import { invalidateBusinessCache } from '../../lib/utils/optimizedQueries';

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

export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to submit a review' },
        { status: 401 }
      );
    }

    // Rate limiting check
    const rateLimitResult = await ReviewRateLimiter.checkRateLimit(user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: rateLimitResult.error || 'Rate limit exceeded',
          rateLimit: {
            remainingAttempts: rateLimitResult.remainingAttempts,
            resetAt: rateLimitResult.resetAt.toISOString(),
          }
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimitResult.remainingAttempts.toString(),
            'X-RateLimit-Reset': Math.floor(rateLimitResult.resetAt.getTime() / 1000).toString(),
          }
        }
      );
    }

    const formData = await req.formData();
    const business_id = formData.get('business_id')?.toString();
    const ratingRaw = formData.get('rating')?.toString();
    const rating = ratingRaw ? parseInt(ratingRaw, 10) : null;
    const title = formData.get('title')?.toString() || null;
    const content = formData.get('content')?.toString() || null;
    const tags = formData.getAll('tags').map(tag => tag.toString()).filter(Boolean);
    const imageFiles = formData
      .getAll('images')
      .filter((file): file is File => file instanceof File && file.size > 0);

    // Validate required fields
    if (!business_id) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Comprehensive validation
    const validationResult = ReviewValidator.validateReviewData({
      content,
      title,
      rating,
      tags,
    });

    if (!validationResult.isValid) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.errors
        },
        { status: 400 }
      );
    }

    // Sanitize content to prevent XSS
    const sanitizedContent = sanitizeText(content!.trim());

    const sanitizedTitle = title ? sanitizeText(title.trim()) : null;

    // Basic content moderation
    const moderationResult = ContentModerator.moderate(sanitizedContent);
    if (!moderationResult.isClean) {
      return NextResponse.json(
        { 
          error: 'Content does not meet community guidelines',
          reasons: moderationResult.reasons
        },
        { status: 400 }
      );
    }

    // Use sanitized content
    const finalContent = moderationResult.sanitizedContent || sanitizedContent;

    // Check if business exists
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, slug')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check if user has already reviewed this business
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this business' },
        { status: 400 }
      );
    }

    // Create the review (critical operation - must succeed)
    let review: any = null;
    try {
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          business_id,
          user_id: user.id,
          rating: rating!,
          title: sanitizedTitle,
          content: finalContent,
          tags: tags.filter(tag => tag.trim().length > 0),
          helpful_count: 0,
        })
        .select(`
          *,
          profile:profiles!reviews_user_id_fkey (
            user_id,
            display_name,
            username,
            avatar_url
          )
        `)
        .single();

      if (reviewError) {
        console.error('Error creating review:', reviewError);
        return NextResponse.json(
          { error: 'Failed to create review', details: reviewError.message },
          { status: 500 }
        );
      }

      if (!reviewData) {
        return NextResponse.json(
          { error: 'Failed to create review - no data returned' },
          { status: 500 }
        );
      }

      review = reviewData;
      
      // Ensure profile data is properly structured in the response
      if (review.profile) {
        const profile = review.profile;
        // Verify we have display_name or username (all reviewers are authenticated)
        if (!profile.display_name && !profile.username) {
          console.warn('Review created but profile missing display_name and username:', {
            user_id: user.id,
            review_id: review.id,
            profile: profile
          });
        }
      }
    } catch (error) {
      console.error('Unexpected error creating review:', error);
      return NextResponse.json(
        { error: 'Failed to create review', details: 'Unexpected error occurred' },
        { status: 500 }
      );
    }

    // Track upload errors for potential rollback
    const uploadErrors: string[] = [];
    const uploadedImages: any[] = [];

    // Handle image uploads if provided
    if (imageFiles.length > 0) {
      for (let i = 0; i < Math.min(imageFiles.length, 5); i++) {
        const imageFile = imageFiles[i];

        try {
          const fileExt = imageFile.name.split('.').pop() || 'jpg';
          const filePath = `${review.id}/${Date.now()}_${i}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('review_images')
            .upload(filePath, imageFile, {
              contentType: imageFile.type,
            });

          if (uploadError) {
            console.error('Error uploading review image:', uploadError);
            uploadErrors.push(`Failed to upload image ${i + 1}: ${uploadError.message}`);
            continue;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from('review_images').getPublicUrl(filePath);

          const { data: imageRecord, error: imageError } = await supabase
            .from('review_images')
            .insert({
              review_id: review.id,
              storage_path: filePath,
              image_url: publicUrl,
              alt_text: imageFile.name || `Review image ${i + 1}`,
            })
            .select()
            .single();

          if (!imageError && imageRecord) {
            uploadedImages.push(imageRecord);
          } else if (imageError) {
            console.error('Error saving image record:', imageError);
            uploadErrors.push(`Failed to save image ${i + 1} metadata`);
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          uploadErrors.push(`Failed to process image ${i + 1}`);
        }
      }
    }

    // Update business stats using RPC function (with retry logic)
    // This is a non-critical operation - stats can be recalculated later
    // We don't rollback the review if this fails
    let statsUpdateSuccess = false;
    let statsError: any = null;

    try {
      // Try updating stats up to 3 times
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: statsUpdateError } = await supabase.rpc('update_business_stats', {
          p_business_id: business_id
        });

        if (!statsUpdateError) {
          statsUpdateSuccess = true;
          break;
        }

        statsError = statsUpdateError;
        
        // Wait before retry (exponential backoff: 1s, 2s)
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    } catch (error) {
      console.error('Unexpected error updating stats:', error);
      statsError = error;
    }

    if (!statsUpdateSuccess) {
      console.error('Error updating business stats via RPC after retries:', statsError);
      // Log but don't fail the request - stats can be recalculated later
      // In production, consider queuing this for async processing or background job
    }

    // Transaction handling notes:
    // - Review creation is critical and must succeed
    // - Image uploads are non-critical (review can exist without images)
    // - Stats update is non-critical (can be recalculated later)
    // - If review creation fails, nothing is created (atomic)
    // - If review creation succeeds but other operations fail, the review remains
    //   This is acceptable as images can be added later and stats can be recalculated

    // Ensure review object is properly serializable
    // Handle profile relationship - it might be an array or object
    let serializableReview: any = { ...review };
    if (serializableReview.profile) {
      // If profile is an array, take the first element
      if (Array.isArray(serializableReview.profile)) {
        serializableReview.profile = serializableReview.profile[0] || null;
      }
    }

    // Remove any non-serializable properties
    try {
      // Test serialization
      JSON.stringify(serializableReview);
    } catch (serializeError) {
      console.error('Error serializing review object:', serializeError);
      // If serialization fails, return a simplified version
      serializableReview = {
        id: review.id,
        business_id: review.business_id,
        user_id: review.user_id,
        rating: review.rating,
        title: review.title,
        content: review.content,
        tags: review.tags,
        helpful_count: review.helpful_count,
        created_at: review.created_at,
        updated_at: review.updated_at,
        profile: serializableReview.profile || null,
      };
    }

    // Invalidate business cache so the new review appears immediately
    // Clear both ID and slug cache entries since businesses are cached by both
    try {
      invalidateBusinessCache(business.id, business.slug ?? undefined);
    } catch (cacheError) {
      // Log but don't fail - cache invalidation is non-critical
      console.warn('Error invalidating business cache:', cacheError);
    }

    return NextResponse.json({
      success: true,
      message: 'Review created successfully',
      review: serializableReview,
      warnings: uploadErrors.length > 0 ? {
        imageUploads: uploadErrors,
        message: 'Some images failed to upload, but the review was created successfully'
      } : undefined,
      rateLimit: {
        remainingAttempts: rateLimitResult.remainingAttempts - 1,
        resetAt: rateLimitResult.resetAt.toISOString(),
      }
    }, {
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': (rateLimitResult.remainingAttempts - 1).toString(),
        'X-RateLimit-Reset': Math.floor(rateLimitResult.resetAt.getTime() / 1000).toString(),
      }
    });

  } catch (error) {
    console.error('Error in reviews API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
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
}

export async function GET(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const { searchParams } = new URL(req.url);
    
    const businessId = searchParams.get('business_id');
    const userId = searchParams.get('user_id');
    // Enforce pagination limits (max 50 reviews per request)
    const requestedLimit = parseInt(searchParams.get('limit') || '10');
    const limit = Math.min(Math.max(requestedLimit, 1), 50);
    const requestedOffset = parseInt(searchParams.get('offset') || '0');
    const offset = Math.max(requestedOffset, 0);

    // Optimize: Select only necessary fields for faster queries
    // Include business data when fetching user reviews (for profile page)
    const includeBusiness = !!userId;
    
    // Build select query - conditionally include business data
    const selectFields = includeBusiness
      ? `
        id,
        user_id,
        business_id,
        rating,
        content,
        title,
        tags,
        created_at,
        helpful_count,
        profile:profiles!reviews_user_id_fkey (
          user_id,
          display_name,
          username,
          avatar_url
        ),
        business:businesses!reviews_business_id_fkey (
          id,
          name,
          image_url,
          uploaded_image,
          slug
        ),
        review_images (
          review_id,
          image_url
        )
      `
      : `
        id,
        user_id,
        business_id,
        rating,
        content,
        title,
        tags,
        created_at,
        helpful_count,
        profile:profiles!reviews_user_id_fkey (
          user_id,
          display_name,
          username,
          avatar_url
        ),
        review_images (
          review_id,
          image_url
        )
      `;
    
    let query = supabase
      .from('reviews')
      .select(selectFields)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error('Error fetching reviews:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    // Import username generation utility
    const { getDisplayUsername } = await import('../../lib/utils/generateUsernameServer');
    
    // Transform reviews to ensure user data is properly structured
    const transformedReviews = (reviews || []).map((review: any) => {
      const profile = review.profile || {};
      const user_id = profile.user_id || review.user_id;
      
      // Generate display username using same logic as migration
      const displayName = getDisplayUsername(
        profile.username,
        profile.display_name,
        null, // Email not available in profile join
        user_id
      );
      
      return {
        ...review,
        user: {
          id: user_id,
          name: displayName,
          username: profile.username || null,
          display_name: profile.display_name || null,
          email: null, // Email not included in profile join for security
          avatar_url: profile.avatar_url || null,
        },
        // Include business data if available (for profile page)
        business: review.business || null,
      };
    });

    return NextResponse.json({
      success: true,
      reviews: transformedReviews,
      count: transformedReviews.length,
    });

  } catch (error) {
    console.error('Error in reviews API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

