import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/reviews/recent?limit=10
 * Fetches recent reviews with user and business data
 * PUBLIC ENDPOINT - Uses service role for unauthenticated access
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedLimit = parseInt(searchParams.get('limit') || '10', 10);
    const limit = Math.min(20, Math.max(10, Number.isNaN(requestedLimit) ? 10 : requestedLimit));

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[Recent Reviews] Missing Supabase credentials');
      return NextResponse.json({ ok: true, reviews: [], total: 0 });
    }

    // Use service role client for public queries
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Fetch recent reviews with related data - try simpler query first
    let reviews: any[] = [];

    // Slim query: only fields needed for UI; no review_images (fetched separately, capped to 2 per review)
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        content,
        created_at,
        helpful_count,
        tags,
        user_id,
        business_id,
        profiles!reviews_user_id_fkey (
          user_id,
          display_name,
          avatar_url
        ),
        businesses!reviews_business_id_fkey (
          id,
          name,
          primary_category_slug,
          primary_subcategory_slug
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Recent Reviews] Full query failed, trying simple query:', error.message);

      const { data: simpleData, error: simpleError } = await supabase
        .from('reviews')
        .select('id, rating, content, created_at, helpful_count, tags, user_id, business_id')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (simpleError) {
        console.error('[Recent Reviews] Simple query also failed:', simpleError);
        return NextResponse.json({ ok: true, reviews: [], total: 0 });
      }

      reviews = simpleData || [];
    } else {
      reviews = data || [];
    }

    // Fetch at most 2 image URLs per review (ordered by created_at asc)
    const reviewIds = (reviews || []).map((r: any) => r.id).filter(Boolean);
    let imagesByReviewId: Record<string, string[]> = {};
    if (reviewIds.length > 0) {
      const { data: imageRows } = await supabase
        .from('review_images')
        .select('review_id, image_url, created_at')
        .in('review_id', reviewIds)
        .order('created_at', { ascending: true });

      if (imageRows?.length) {
        const map: Record<string, string[]> = {};
        for (const row of imageRows) {
          const id = row.review_id;
          if (!map[id]) map[id] = [];
          if (map[id].length < 2 && row.image_url) map[id].push(row.image_url);
        }
        imagesByReviewId = map;
      }
    }

    // Transform to match expected format; images capped to 2 per review
    const transformedReviews = (reviews || []).map((review: any) => {
      const profile = review.profiles;
      const business = review.businesses;
      const displayName = profile?.display_name || 'Anonymous';

      return {
        id: review.id,
        rating: review.rating,
        reviewText: review.content,
        date: new Date(review.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        likes: review.helpful_count || 0,
        tags: review.tags || [],
        images: (imagesByReviewId[review.id] || []).slice(0, 2),
        reviewer: {
          id: profile?.user_id || review.user_id,
          name: displayName,
          username: profile?.username,
          profilePicture: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
          reviewCount: 0,
          rating: 4.5,
          location: 'Cape Town'
        },
        businessName: business?.name || 'Unknown Business',
        businessType: business?.primary_category_slug || 'Local Business',
        businessId: business?.id || review.business_id
      };
    });

    return NextResponse.json({
      ok: true,
      reviews: transformedReviews,
      total: transformedReviews.length
    });

  } catch (error: any) {
    console.error('[Recent Reviews] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent reviews', message: error.message },
      { status: 500 }
    );
  }
}
