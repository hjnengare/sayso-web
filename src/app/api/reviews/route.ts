import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSupabase } from '../../lib/supabase/server';
import { ReviewValidator } from '../../lib/utils/validation';
import { ContentModerator } from '../../lib/utils/contentModeration';
import { invalidateBusinessCache } from '../../lib/utils/optimizedQueries';

// ============================================================================
// Structured Error Response Helpers
// ============================================================================

type ReviewErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'EMAIL_NOT_VERIFIED'
  | 'MISSING_FIELDS'
  | 'INVALID_RATING'
  | 'CONTENT_TOO_SHORT'
  | 'CONTENT_TOO_LONG'
  | 'TITLE_TOO_LONG'
  | 'VALIDATION_FAILED'
  | 'CONTENT_MODERATION_FAILED'
  | 'BUSINESS_NOT_FOUND'
  | 'EVENT_NOT_FOUND'
  | 'SPECIAL_NOT_FOUND'
  | 'DUPLICATE_REVIEW'
  | 'RLS_BLOCKED'
  | 'DB_ERROR'
  | 'IMAGE_UPLOAD_FAILED'
  | 'SERVER_ERROR';

interface ReviewErrorResponse {
  success: false;
  code: ReviewErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

function errorResponse(
  code: ReviewErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse<ReviewErrorResponse> {
  return NextResponse.json(
    { success: false, code, message, details },
    { status }
  );
}

// Simple text sanitization function (strips HTML tags and decodes basic entities)
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase(req);

    // Auth: optional for legacy business reviews (anonymous allowed); required for event/special
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const isAnonymous = !user || authError;

    const formData = await req.formData();
    const businessIdentifier = formData.get('business_id')?.toString();
    const targetId = formData.get('target_id')?.toString();
    const reviewType = formData.get('type')?.toString(); // 'event' | 'special' | undefined => legacy business
    const ratingRaw = formData.get('rating')?.toString();
    const rating = ratingRaw ? parseInt(ratingRaw, 10) : null;
    const title = formData.get('title')?.toString() || null;
    const content = formData.get('content')?.toString() || null;
    const tags = formData.getAll('tags').map(t => t.toString()).filter(Boolean);

    // Guest fields for event/special reviews
    const guestName = formData.get('guest_name')?.toString()?.trim() || null;
    const guestEmail = formData.get('guest_email')?.toString()?.trim() || null;
    const honeypot = formData.get('website_url')?.toString() || '';

    const imageFiles = formData
      .getAll('images')
      .filter((file): file is File => file instanceof File && file.size > 0);

    const MAX_REVIEW_IMAGES = 10;
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const uploadErrors: any[] = [];
    const uploadedImages: any[] = [];

    // Determine review type
    let isEventReview = false;
    let isSpecialReview = false;
    let targetTable = 'reviews';
    let targetColumn = 'business_id';

    if (reviewType === 'event') {
      isEventReview = true;
      targetTable = 'event_reviews';
      targetColumn = 'event_id';
      if (!targetId) {
        return errorResponse(
          'MISSING_FIELDS',
          'Please select an event to review.',
          400
        );
      }
    } else if (reviewType === 'special') {
      isSpecialReview = true;
      targetTable = 'special_reviews';
      targetColumn = 'special_id';
      if (!targetId) {
        return errorResponse(
          'MISSING_FIELDS',
          'Please select a special to review.',
          400
        );
      }
    } else {
      // legacy business review — anonymous allowed
      if (!businessIdentifier) {
        return errorResponse(
          'MISSING_FIELDS',
          'Please select a business to review.',
          400
        );
      }
    }

    // Honeypot check — bots fill hidden fields, real users don't
    if (honeypot) {
      return NextResponse.json({ success: true, message: 'Review created successfully', review: {} });
    }

    // Guest validation for event/special reviews
    if (isAnonymous && (isEventReview || isSpecialReview)) {
      if (!guestName || guestName.length < 2 || guestName.length > 50) {
        return errorResponse('MISSING_FIELDS', 'Please provide your name (2-50 characters).', 400);
      }
      if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
        return errorResponse('MISSING_FIELDS', 'Please provide a valid email address.', 400);
      }
    }

    // IP-based rate limiting for guest event/special reviews (3 per hour per IP)
    if (isAnonymous && (isEventReview || isSpecialReview)) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || 'unknown';

      const rateLimitAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const rateLimitTable = isEventReview ? 'event_reviews' : 'special_reviews';

      const { count } = await rateLimitAdmin
        .from(rateLimitTable)
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .gte('created_at', oneHourAgo);

      if ((count ?? 0) >= 3) {
        return errorResponse(
          'VALIDATION_FAILED',
          'Too many reviews submitted. Please try again later.',
          429
        );
      }
    }

    // Resolve target + validate existence
    let targetData: any = null;

    // This is ONLY available for legacy business branch; for special/event we won’t assume it exists.
    let resolvedBusiness: { id: string; name: string; slug: string | null } | null = null;

    if (isEventReview) {
      const { data: eventData, error: eventError } = await supabase
        .from('ticketmaster_events')
        .select('ticketmaster_id, name, business_name')
        .eq('ticketmaster_id', targetId)
        .maybeSingle();

      if (eventError) {
        console.error('[API] Error checking event:', eventError);
        return errorResponse(
          'DB_ERROR',
          "We couldn't verify the event. Please try again.",
          500
        );
      }
      if (!eventData) {
        return errorResponse(
          'EVENT_NOT_FOUND',
          "We couldn't find that event. It may have been removed.",
          404
        );
      }

      targetData = eventData;
    } else if (isSpecialReview) {
      const { data: specialData, error: specialError } = await supabase
        .from('events_and_specials')
        .select('id, title, business_id, businesses:business_id(name, slug)')
        .eq('id', targetId)
        .eq('type', 'special')
        .maybeSingle();

      if (specialError) {
        console.error('[API] Error checking special:', specialError);
        return errorResponse(
          'DB_ERROR',
          "We couldn't verify the special. Please try again.",
          500
        );
      }
      if (!specialData) {
        return errorResponse(
          'SPECIAL_NOT_FOUND',
          "We couldn't find that special. It may have expired or been removed.",
          404
        );
      }

      const businessName = Array.isArray(specialData.businesses)
        ? specialData.businesses[0]?.name
        : (specialData.businesses as any)?.name;

      const businessSlug = Array.isArray(specialData.businesses)
        ? specialData.businesses[0]?.slug
        : (specialData.businesses as any)?.slug;

      targetData = {
        ...specialData,
        business_name: businessName || 'Unknown Business',
        business_slug: businessSlug || null,
      };

      // For cache invalidation later
      if (typeof specialData.business_id === 'string' && UUID_REGEX.test(specialData.business_id)) {
        resolvedBusiness = {
          id: specialData.business_id,
          name: businessName || 'Unknown Business',
          slug: businessSlug || null,
        };
      }
    } else {
      // Legacy business review: resolve slug OR uuid
      let business_id: string | null = null;

      // Try slug
      const { data: slugData, error: slugError } = await supabase
        .from('businesses')
        .select('id, name, slug')
        .eq('slug', businessIdentifier)
        .eq('status', 'active')
        .maybeSingle();

      if (slugError) {
        console.error('[API] Error checking slug in POST reviews endpoint:', slugError);
      } else if (slugData?.id) {
        business_id = slugData.id;
        resolvedBusiness = {
          id: slugData.id,
          name: slugData.name,
          slug: slugData.slug ?? null,
        };
      } else {
        // Try uuid
        if (UUID_REGEX.test(businessIdentifier!)) {
          const { data: idData, error: idError } = await supabase
            .from('businesses')
            .select('id, name, slug')
            .eq('id', businessIdentifier)
            .eq('status', 'active')
            .maybeSingle();

          if (idError) {
            console.error('[API] Error checking business ID in POST reviews endpoint:', idError);
          } else if (idData?.id) {
            business_id = idData.id;
            resolvedBusiness = {
              id: idData.id,
              name: idData.name,
              slug: idData.slug ?? null,
            };
          }
        }
      }

      if (!business_id || !resolvedBusiness) {
        return errorResponse(
          'BUSINESS_NOT_FOUND',
          "We couldn't find that business. Please try again.",
          404
        );
      }

      if (!UUID_REGEX.test(business_id)) {
        console.error('[API] Invalid UUID format for business_id in POST:', business_id);
        return errorResponse(
          'BUSINESS_NOT_FOUND',
          "Invalid business. Please select a valid business to review.",
          400
        );
      }

      targetData = resolvedBusiness;
    }

    // Validate review content
    const validationResult = ReviewValidator.validateReviewData({
      content,
      title,
      rating,
      tags,
    });

    if (!validationResult.isValid) {
      // Create user-friendly message from validation errors
      const errors = validationResult.errors || [];
      let userMessage = 'Please check your review and try again.';
      
      if (errors.some((e: string) => e.toLowerCase().includes('rating'))) {
        userMessage = 'Please select a rating (1-5 stars).';
      } else if (errors.some((e: string) => e.toLowerCase().includes('content') && e.toLowerCase().includes('short'))) {
        userMessage = 'Your review is too short. Please write at least 10 characters.';
      } else if (errors.some((e: string) => e.toLowerCase().includes('content') && e.toLowerCase().includes('long'))) {
        userMessage = 'Your review is too long. Please keep it under 5000 characters.';
      } else if (errors.some((e: string) => e.toLowerCase().includes('content'))) {
        userMessage = 'Please write a review describing your experience.';
      } else if (errors.some((e: string) => e.toLowerCase().includes('title'))) {
        userMessage = 'Review title is too long. Please keep it under 100 characters.';
      }

      return errorResponse(
        'VALIDATION_FAILED',
        userMessage,
        400,
        { errors }
      );
    }

    // Sanitize + moderate
    const sanitizedContent = sanitizeText(content!.trim());
    const sanitizedTitle = title ? sanitizeText(title.trim()) : null;

    const moderationResult = ContentModerator.moderate(sanitizedContent);
    if (!moderationResult.isClean) {
      return errorResponse(
        'CONTENT_MODERATION_FAILED',
        'Your review contains content that doesn\'t meet our community guidelines. Please revise and try again.',
        400,
        { reasons: moderationResult.reasons }
      );
    }

    const finalContent = moderationResult.sanitizedContent || sanitizedContent;

    // ✅ IMPORTANT: declare OUTSIDE so later code can read it
    let reviewInsertData: any = null;

    // Create review
    let review: any = null;
    try {
      reviewInsertData = {
        user_id: !isAnonymous && user ? user.id : null,
        rating: rating!,
        title: sanitizedTitle,
        content: finalContent,
        tags: tags.filter(t => t.trim().length > 0),
        helpful_count: 0,
        // Guest fields (only for anonymous event/special reviews)
        ...(isAnonymous && (isEventReview || isSpecialReview) && guestName ? { guest_name: guestName } : {}),
        ...(isAnonymous && (isEventReview || isSpecialReview) && guestEmail ? { guest_email: guestEmail } : {}),
        ...(isAnonymous && (isEventReview || isSpecialReview) ? { ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null } : {}),
      };

      let selectQuery = '';

      if (isEventReview) {
        reviewInsertData.event_id = targetId;
        selectQuery = `
          *,
          profile:profiles!event_reviews_user_id_fkey (
            user_id,
            display_name,
            username,
            avatar_url
          )
        `;
      } else if (isSpecialReview) {
        reviewInsertData.special_id = targetId;
        selectQuery = `
          *,
          profile:profiles!special_reviews_user_id_fkey (
            user_id,
            display_name,
            username,
            avatar_url
          )
        `;
      } else {
        reviewInsertData.business_id = (targetData as any).id;
        selectQuery = `
          *,
          profile:profiles!reviews_user_id_fkey (
            user_id,
            display_name,
            username,
            avatar_url
          )
        `;
      }

      // Use service role client for guest inserts (bypasses RLS)
      const insertClient = isAnonymous && (isEventReview || isSpecialReview)
        ? createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
          )
        : supabase;

      const { data: reviewData, error: reviewError } = await insertClient
        .from(targetTable)
        .insert(reviewInsertData)
        .select(selectQuery)
        .single();

      if (reviewError) {
        console.error('[Review API] Error creating review:', reviewError);
        
        // Check for RLS/permission errors
        if (reviewError.message?.includes('permission') || reviewError.code === '42501') {
          return errorResponse(
            'RLS_BLOCKED',
            "We couldn't save your review right now. Please try again.",
            403
          );
        }
        
        // Check for duplicate/unique constraint errors
        if (reviewError.code === '23505' || reviewError.message?.includes('duplicate')) {
          return errorResponse(
            'DUPLICATE_REVIEW',
            "You've already reviewed this. You can edit your existing review instead.",
            409
          );
        }
        
        return errorResponse(
          'DB_ERROR',
          "We couldn't save your review. Please try again.",
          500
        );
      }

      if (!reviewData) {
        return errorResponse(
          'DB_ERROR',
          "We couldn't save your review. Please try again.",
          500
        );
      }

      review = reviewData;
    } catch (error) {
      console.error('[Review API] Unexpected error creating review:', error);
      return errorResponse(
        'SERVER_ERROR',
        'Something went wrong. Please try again.',
        500
      );
    }

    // Update business stats (non-critical)
    let statsUpdateSuccess = false;
    let statsError: any = null;

    // We only attempt stats update if we have a business_id
    // - legacy review: reviewInsertData.business_id exists
    // - special review: targetData.business_id exists
    // - event review: likely no business_id (skip)
    let statsBusinessId: string | null = null;

    if (reviewInsertData?.business_id && typeof reviewInsertData.business_id === 'string') {
      statsBusinessId = reviewInsertData.business_id;
    } else if (isSpecialReview && typeof targetData?.business_id === 'string') {
      statsBusinessId = targetData.business_id;
    }

    if (statsBusinessId && UUID_REGEX.test(statsBusinessId)) {
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          const { error: statsUpdateError } = await supabase.rpc('update_business_stats', {
            p_business_id: statsBusinessId,
          });
          if (!statsUpdateError) {
            statsUpdateSuccess = true;
            break;
          }
          statsError = statsUpdateError;
        }
      } catch (err) {
        statsError = err;
      }
    }

    // Upload review images using service role client (bypasses RLS for anonymous reviews)
    if (!isEventReview && !isSpecialReview && imageFiles.length > 0 && review?.id) {
      const validImages = imageFiles
        .filter(f => ALLOWED_IMAGE_TYPES.includes(f.type) && f.size <= MAX_IMAGE_SIZE)
        .slice(0, MAX_REVIEW_IMAGES);

      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      for (let i = 0; i < validImages.length; i++) {
        const file = validImages[i];
        try {
          const fileExt = file.name.split('.').pop() || 'jpg';
          const filePath = `reviews/${review.id}/${Date.now()}-${i}.${fileExt}`;

          const arrayBuffer = await file.arrayBuffer();
          const { error: storageError } = await adminClient.storage
            .from('review_images')
            .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false });

          if (storageError) {
            console.error('[Review API] Image upload error:', storageError);
            uploadErrors.push({ file: file.name, error: storageError.message });
            continue;
          }

          const { data: urlData } = adminClient.storage
            .from('review_images')
            .getPublicUrl(filePath);

          const { data: imageRecord, error: insertError } = await adminClient
            .from('review_images')
            .insert({
              review_id: review.id,
              image_url: urlData.publicUrl,
              storage_path: filePath,
              alt_text: file.name,
            })
            .select()
            .single();

          if (insertError) {
            console.error('[Review API] Image record insert error:', insertError);
            await adminClient.storage.from('review_images').remove([filePath]);
            uploadErrors.push({ file: file.name, error: insertError.message });
            continue;
          }

          uploadedImages.push({
            id: imageRecord.id,
            review_id: review.id,
            image_url: imageRecord.image_url,
            storage_path: filePath,
            alt_text: file.name,
            created_at: imageRecord.created_at,
          });
        } catch (imgErr) {
          console.error('[Review API] Image processing error:', imgErr);
          uploadErrors.push({ file: file.name, error: 'Processing failed' });
        }
      }
    }

    // Fetch complete review (table-aware)
    const fetchTable = isEventReview ? 'event_reviews' : isSpecialReview ? 'special_reviews' : 'reviews';

    const fetchSelect = isEventReview
      ? `
        *,
        profile:profiles!event_reviews_user_id_fkey (
          user_id,
          display_name,
          username,
          avatar_url
        )
      `
      : isSpecialReview
      ? `
        *,
        profile:profiles!special_reviews_user_id_fkey (
          user_id,
          display_name,
          username,
          avatar_url
        )
      `
      : `
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
      `;

    const { data: completeReviewData } = await supabase
      .from(fetchTable)
      .select(fetchSelect)
      .eq('id', review.id)
      .maybeSingle();

    const reviewToReturn = completeReviewData || review;

    // Username generation utility
    let getDisplayUsername: any;
    try {
      const usernameModule = await import('../../lib/utils/generateUsernameServer');
      getDisplayUsername = usernameModule.getDisplayUsername;
    } catch (importError) {
      console.error('Error importing getDisplayUsername:', importError);
      getDisplayUsername = (username: string | null, displayName: string | null, _email: string | null, userId: string) =>
        displayName || username || `Anonymous`;
    }

    // Normalize profile shape
    let serializableReview: any = { ...reviewToReturn };
    if (serializableReview.profile && Array.isArray(serializableReview.profile)) {
      serializableReview.profile = serializableReview.profile[0] || null;
    }

    const profile = serializableReview.profile || {};
    const user_id = profile.user_id ?? serializableReview.user_id ?? (user?.id ?? null);

    let displayName: string;
    if (user_id == null) {
      displayName = reviewInsertData?.guest_name || 'Guest';
    } else {
      try {
        displayName = getDisplayUsername(profile.username, profile.display_name, null, user_id);
      } catch (nameError) {
        console.error('Error generating display name:', nameError);
        displayName = profile.display_name || profile.username || 'Anonymous';
      }
    }

    serializableReview.user = {
      id: user_id,
      name: displayName,
      username: profile.username ?? null,
      display_name: user_id == null ? (reviewInsertData?.guest_name || 'Guest') : (profile.display_name ?? null),
      email: null,
      avatar_url: profile.avatar_url ?? null,
    };

    // Images only exist on legacy reviews in this snippet
    if (!isEventReview && !isSpecialReview) {
      serializableReview.review_images = serializableReview.review_images || uploadedImages;
      serializableReview.images = serializableReview.review_images || uploadedImages;
    } else {
      serializableReview.images = [];
    }

    // Ensure serializable
    try {
      JSON.stringify(serializableReview);
    } catch (serializeError) {
      console.error('Error serializing review object:', serializeError);
      serializableReview = {
        id: review.id,
        user_id: review.user_id,
        rating: review.rating,
        title: review.title,
        content: review.content,
        tags: review.tags,
        helpful_count: review.helpful_count,
        created_at: review.created_at,
        updated_at: review.updated_at,
        user: serializableReview.user,
        images: serializableReview.images || [],
      };
    }

    // Cache invalidation: ONLY if we actually have a resolved business (legacy OR special)
    try {
      if (resolvedBusiness?.id) {
        invalidateBusinessCache(resolvedBusiness.id, resolvedBusiness.slug ?? undefined);
      }
    } catch (cacheError) {
      console.warn('Error invalidating business cache:', cacheError);
    }

    // Fire and forget badge awarding (skip for anonymous reviews)
    if (!isAnonymous && user?.id) {
      fetch(`${req.headers.get('origin') || 'http://localhost:3000'}/api/badges/check-and-award`, {
        method: 'POST',
        headers: {
          Cookie: req.headers.get('cookie') || '',
          'Content-Type': 'application/json',
        },
      }).catch(err => {
        console.warn('[Review Create] Error triggering badge check:', err);
      });
    }

    const rateLimitResult = {
      remainingAttempts: 10,
      resetAt: new Date(Date.now() + 60 * 60 * 1000),
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Review created successfully',
        review: serializableReview,
        warnings: uploadErrors.length > 0
          ? {
              imageUploads: uploadErrors,
              message: 'Some images failed to upload, but the review was created successfully',
            }
          : undefined,
        stats: {
          updated: statsUpdateSuccess,
          error: statsUpdateSuccess ? null : statsError ? String(statsError?.message || statsError) : null,
        },
        rateLimit: {
          remainingAttempts: rateLimitResult.remainingAttempts - 1,
          resetAt: rateLimitResult.resetAt.toISOString(),
        },
      },
      {
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': (rateLimitResult.remainingAttempts - 1).toString(),
          'X-RateLimit-Reset': Math.floor(rateLimitResult.resetAt.getTime() / 1000).toString(),
        },
      }
    );
  } catch (error) {
    console.error('[Review API] Unexpected error:', error);
    return errorResponse(
      'SERVER_ERROR',
      'Something went wrong on our side. Please try again.',
      500
    );
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await getServerSupabase(req);
    const { searchParams } = new URL(req.url);

    const businessIdentifier = searchParams.get('business_id');
    const userId = searchParams.get('user_id');

    const requestedLimit = parseInt(searchParams.get('limit') || '10', 10);
    const limit = Math.min(Math.max(requestedLimit, 1), 50);
    const requestedOffset = parseInt(searchParams.get('offset') || '0', 10);
    const offset = Math.max(requestedOffset, 0);

    console.log('[/api/reviews] GET request:', { businessIdentifier, userId, limit, offset });

    // Resolve business identifier -> UUID
    let businessId: string | null = null;

    if (businessIdentifier) {
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
        if (UUID_REGEX.test(businessIdentifier)) {
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

      if (businessId) {
        if (typeof businessId !== 'string' || !UUID_REGEX.test(businessId)) {
          console.error('[API] Invalid UUID format for businessId:', businessId);
          return NextResponse.json({ error: 'Invalid business identifier format' }, { status: 400 });
        }
      } else {
        return NextResponse.json(
          { error: 'Business not found', details: 'Invalid business identifier' },
          { status: 404 }
        );
      }
    }

    const includeBusiness = !!userId;

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

    if (businessId) query = query.eq('business_id', businessId);
    if (userId) query = query.eq('user_id', userId);

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
          supabase: { message: error.message, code: error.code },
        },
        { status: 500 }
      );
    }

    let getDisplayUsername: any;
    try {
      const usernameModule = await import('../../lib/utils/generateUsernameServer');
      getDisplayUsername = usernameModule.getDisplayUsername;
    } catch (importError) {
      console.error('Error importing getDisplayUsername:', importError);
      getDisplayUsername = (username: string | null, displayName: string | null, _email: string | null, userId: string) =>
        displayName || username || 'Anonymous';
    }

    const transformedReviews = (reviews || []).map((review: any) => {
      try {
        const profile = review.profile || {};
        const user_id = profile.user_id ?? review.user_id;

        let displayName: string;
        if (user_id == null) {
          displayName = 'Anonymous';
        } else {
          try {
            displayName = getDisplayUsername(profile.username, profile.display_name, null, user_id);
          } catch (nameError) {
            console.error('Error generating display name:', nameError);
            displayName = profile.display_name || profile.username || 'Anonymous';
          }
        }

        return {
          ...review,
          user: {
            id: user_id,
            name: displayName,
            username: profile.username ?? null,
            display_name: user_id == null ? 'Anonymous' : (profile.display_name ?? null),
            email: null,
            avatar_url: profile.avatar_url ?? null,
          },
          business: review.business || null,
          images: review.review_images || [],
        };
      } catch (transformError) {
        console.error('Error transforming review:', transformError, { review_id: review?.id });
        return {
          ...review,
          user: {
            id: review.user_id ?? null,
            name: 'Anonymous',
            username: null,
            display_name: 'Anonymous',
            email: null,
            avatar_url: null,
          },
          business: review.business || null,
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
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}
