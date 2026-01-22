import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../lib/supabase/server';
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
    const supabase = await getServerSupabase(req);
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to submit a review' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const businessIdentifier = formData.get('business_id')?.toString();
    const ratingRaw = formData.get('rating')?.toString();
    const rating = ratingRaw ? parseInt(ratingRaw, 10) : null;
    const title = formData.get('title')?.toString() || null;
    const content = formData.get('content')?.toString() || null;
    const tags = formData.getAll('tags').map(tag => tag.toString()).filter(Boolean);
    const imageFiles = formData
      .getAll('images')
      .filter((file): file is File => file instanceof File && file.size > 0);

    // Validate required fields
    if (!businessIdentifier) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Resolve business identifier (slug or ID) to UUID and get business data
    let business_id: string | null = null;
    let business: { id: string; name: string; slug: string | null } | null = null;
    
    // Try slug first
    const { data: slugData, error: slugError } = await supabase
      .from('businesses')
      .select('id, name, slug')
      .eq('slug', businessIdentifier)
      .eq('status', 'active')
      .maybeSingle();

    if (slugError) {
      console.error('[API] Error checking slug in POST reviews endpoint:', slugError);
    } else if (slugData && typeof slugData === 'object' && 'id' in slugData && typeof slugData.id === 'string' && 'name' in slugData && typeof slugData.name === 'string') {
      business_id = slugData.id;
      business = {
        id: slugData.id,
        name: slugData.name,
        slug: ('slug' in slugData && (typeof slugData.slug === 'string' || slugData.slug === null)) ? slugData.slug : null
      };
    } else {
      // Validate UUID format before trying ID lookup
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(businessIdentifier)) {
        // Check if business exists
        const { data: idData, error: idError } = await supabase
          .from('businesses')
          .select('id, name, slug')
          .eq('id', businessIdentifier)
          .eq('status', 'active')
          .maybeSingle();

        if (idError) {
          console.error('[API] Error checking business ID in POST reviews endpoint:', idError);
        } else if (idData && typeof idData === 'object' && 'id' in idData && typeof idData.id === 'string' && 'name' in idData && typeof idData.name === 'string') {
          business_id = idData.id;
          business = {
            id: idData.id,
            name: idData.name,
            slug: ('slug' in idData && (typeof idData.slug === 'string' || idData.slug === null)) ? idData.slug : null
          };
        }
      }
    }

    if (!business_id || !business) {
      return NextResponse.json(
        { error: 'Business not found', details: 'Invalid business identifier' },
        { status: 404 }
      );
    }

    // Verify business_id is a valid UUID format before using it in database queries
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof business_id !== 'string' || !uuidRegex.test(business_id)) {
      console.error('[API] Invalid UUID format for business_id in POST:', business_id, typeof business_id);
      return NextResponse.json(
        { error: 'Invalid business identifier format' },
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
            console.log(`[API] Successfully saved review image record:`, {
              id: imageRecord.id,
              review_id: review.id,
              storage_path: filePath,
            });
          } else if (imageError) {
            console.error('[API] Error saving image record to database:', {
              error: imageError,
              message: imageError.message,
              code: imageError.code,
              details: imageError.details,
              hint: imageError.hint,
              review_id: review.id,
              storage_path: filePath,
              image_url: publicUrl,
            });
            uploadErrors.push(`Failed to save image ${i + 1} metadata: ${imageError.message}`);
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

    // Fetch the complete review with images and profile data
    const { data: completeReviewData, error: fetchError } = await supabase
      .from('reviews')
      .select(`
        *,
        profile:profiles!reviews_user_id_fkey (
          user_id,
          display_name,
          username,
          avatar_url
        ),
        review_images (
          id,
          review_id,
          image_url,
          storage_path,
          alt_text,
          created_at
        )
      `)
      .eq('id', review.id)
      .single();

    // Use the fetched review if available, otherwise fall back to the original
    const reviewToReturn = completeReviewData || review;

    // Import username generation utility with error handling (same as GET endpoint)
    let getDisplayUsername: any;
    try {
      const usernameModule = await import('../../lib/utils/generateUsernameServer');
      getDisplayUsername = usernameModule.getDisplayUsername;
    } catch (importError) {
      console.error('Error importing getDisplayUsername:', importError);
      // Fallback: use simple display name logic
      getDisplayUsername = (username: string | null, displayName: string | null, email: string | null, userId: string) => {
        return displayName || username || `User ${userId?.slice(0, 8)}` || 'User';
      };
    }

    // Transform review to ensure user data is properly structured (same logic as GET endpoint)
    const profile = reviewToReturn.profile || {};
    const user_id = profile.user_id || reviewToReturn.user_id || user.id;
    
    // Generate display username using same logic as GET endpoint
    let displayName: string;
    try {
      displayName = getDisplayUsername(
        profile.username,
        profile.display_name,
        null, // Email not available in profile join
        user_id
      );
    } catch (nameError) {
      console.error('Error generating display name:', nameError);
      displayName = profile.display_name || profile.username || `User ${user_id?.slice(0, 8)}` || 'User';
    }

    // Ensure review object is properly serializable
    // Handle profile relationship - it might be an array or object
    let serializableReview: any = { ...reviewToReturn };
    if (serializableReview.profile) {
      // If profile is an array, take the first element
      if (Array.isArray(serializableReview.profile)) {
        serializableReview.profile = serializableReview.profile[0] || null;
      }
    }

    // Transform user data to match GET endpoint structure
    serializableReview.user = {
      id: user_id,
      name: displayName,
      username: profile.username || null,
      display_name: profile.display_name || null,
      email: null, // Email not included in profile join for security
      avatar_url: profile.avatar_url || null,
    };

    // Include images in the response
    // Map review_images to images (ReviewCard expects images array with full objects)
    serializableReview.review_images = reviewToReturn.review_images || uploadedImages;
    serializableReview.images = reviewToReturn.review_images || uploadedImages;

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
        user: serializableReview.user || {
          id: user_id,
          name: displayName,
          username: profile.username || null,
          display_name: profile.display_name || null,
          email: null,
          avatar_url: profile.avatar_url || null,
        },
        review_images: serializableReview.review_images || uploadedImages,
        images: serializableReview.images || uploadedImages,
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

    // Asynchronously check and award badges (don't block response)
    // This runs in the background after the review is created
    fetch(`${req.headers.get('origin') || 'http://localhost:3000'}/api/badges/check-and-award`, {
      method: 'POST',
      headers: {
        'Cookie': req.headers.get('cookie') || '',
        'Content-Type': 'application/json'
      }
    }).catch(err => {
      // Log but don't fail - badge awarding is non-critical for review creation
      console.warn('[Review Create] Error triggering badge check:', err);
    });

    const rateLimitResult = {
      remainingAttempts: 10,
      resetAt: new Date(Date.now() + 60 * 60 * 1000),
    };

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
    const supabase = await getServerSupabase(req);
    const { searchParams } = new URL(req.url);
    
    const businessIdentifier = searchParams.get('business_id');
    const userId = searchParams.get('user_id');
    // Enforce pagination limits (max 50 reviews per request)
    const requestedLimit = parseInt(searchParams.get('limit') || '10');
    const limit = Math.min(Math.max(requestedLimit, 1), 50);
    const requestedOffset = parseInt(searchParams.get('offset') || '0');
    const offset = Math.max(requestedOffset, 0);

    console.log('[/api/reviews] GET request:', { businessIdentifier, userId, limit, offset });

    // Resolve business identifier (slug or ID) to UUID
    let businessId: string | null = null;
    if (businessIdentifier) {
      // Try slug first
      const { data: slugData, error: slugError } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', businessIdentifier)
        .eq('status', 'active')
        .maybeSingle();

      if (slugError) {
        console.error('[API] Error checking slug in reviews endpoint:', slugError);
      } else if (slugData?.id) {
        businessId = slugData.id;
      } else {
        // Validate UUID format before trying ID lookup
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(businessIdentifier)) {
          // Check if business exists
          const { data: idData, error: idError } = await supabase
            .from('businesses')
            .select('id')
            .eq('id', businessIdentifier)
            .eq('status', 'active')
            .maybeSingle();

          if (idError) {
            console.error('[API] Error checking business ID in reviews endpoint:', idError);
          } else if (idData?.id) {
            businessId = businessIdentifier;
          }
        }
      }

      // Verify businessId is a valid UUID string before using it in queries
      if (businessId) {
        if (typeof businessId !== 'string') {
          console.error('[API] businessId is not a string:', businessId, typeof businessId);
          return NextResponse.json(
            { error: 'Invalid business identifier type' },
            { status: 400 }
          );
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(businessId)) {
          console.error('[API] Invalid UUID format for businessId:', businessId);
          return NextResponse.json(
            { error: 'Invalid business identifier format' },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Business not found', details: 'Invalid business identifier' },
          { status: 404 }
        );
      }
    }

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
          slug
        ),
        review_images (
          id,
          review_id,
          storage_path,
          image_url,
          alt_text,
          created_at
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
          id,
          review_id,
          storage_path,
          image_url,
          alt_text,
          created_at
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
      console.error('[/api/reviews] GET error fetching reviews:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        { 
          error: 'Failed to fetch reviews', 
          details: error.message,
          code: error.code,
          supabase: {
            message: error.message,
            code: error.code,
          }
        },
        { status: 500 }
      );
    }

    // Import username generation utility with error handling
    let getDisplayUsername: any;
    try {
      const usernameModule = await import('../../lib/utils/generateUsernameServer');
      getDisplayUsername = usernameModule.getDisplayUsername;
    } catch (importError) {
      console.error('Error importing getDisplayUsername:', importError);
      // Fallback: use simple display name logic
      getDisplayUsername = (username: string | null, displayName: string | null, email: string | null, userId: string) => {
        return displayName || username || `User ${userId?.slice(0, 8)}` || 'User';
      };
    }
    
    // Transform reviews to ensure user data is properly structured
    const transformedReviews = (reviews || []).map((review: any) => {
      try {
        const profile = review.profile || {};
        const user_id = profile.user_id || review.user_id;
        
        // Generate display username using same logic as migration
        let displayName: string;
        try {
          displayName = getDisplayUsername(
            profile.username,
            profile.display_name,
            null, // Email not available in profile join
            user_id
          );
        } catch (nameError) {
          console.error('Error generating display name:', nameError);
          displayName = profile.display_name || profile.username || `User ${user_id?.slice(0, 8)}` || 'User';
        }
        
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
          // Map review_images to images (ReviewCard expects images array)
          images: review.review_images || [],
        };
      } catch (transformError) {
        console.error('Error transforming review:', transformError, { review_id: review?.id });
        // Return a minimal valid review structure
        return {
          ...review,
          user: {
            id: review.user_id || 'unknown',
            name: 'User',
            username: null,
            display_name: null,
            email: null,
            avatar_url: null,
          },
          business: review.business || null,
          // Map review_images to images (ReviewCard expects images array)
          images: review.review_images || [],
        };
      }
    });

    return NextResponse.json({
      success: true,
      reviews: transformedReviews,
      count: transformedReviews.length,
    });

  } catch (error) {
    console.error('[/api/reviews] GET unexpected error:', error);
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
}

