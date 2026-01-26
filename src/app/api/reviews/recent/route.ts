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
    const limit = parseInt(searchParams.get('limit') || '10');

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
    let queryError: any = null;

    // Try full query with joins - use FK notation for explicit relationship
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        title,
        content,
        created_at,
        helpful_count,
        tags,
        user_id,
        business_id,
        profiles!reviews_user_id_fkey (
          user_id,
          username,
          display_name,
          avatar_url
        ),
        businesses!reviews_business_id_fkey (
          id,
          name,
          category,
          location,
          image_url
        ),
        review_images (
          image_url,
          alt_text
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Recent Reviews] Full query failed, trying simple query:', error.message);

      // Fallback to simple query without joins
      const { data: simpleData, error: simpleError } = await supabase
        .from('reviews')
        .select('id, rating, title, content, created_at, helpful_count, tags, user_id, business_id')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (simpleError) {
        console.error('[Recent Reviews] Simple query also failed:', simpleError);
        // Return empty array instead of error
        return NextResponse.json({ ok: true, reviews: [], total: 0 });
      }

      reviews = simpleData || [];
    } else {
      reviews = data || [];
    }

    // Transform to match expected format
    const transformedReviews = (reviews || []).map((review: any) => {
      // Handle both joined data and simple data
      const profile = review.profiles;
      const business = review.businesses;
      const displayName = profile?.display_name || profile?.username || 'Anonymous';

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
        images: review.review_images?.map((img: any) => img.image_url) || [],
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
        businessType: business?.category || 'Local Business',
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
