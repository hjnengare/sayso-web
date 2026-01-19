import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/reviews/recent?limit=10
 * Fetches recent reviews with user and business data
 * PUBLIC ENDPOINT - Uses service role for unauthenticated access
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Use service role client for public queries
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Fetch recent reviews with related data
    const { data: reviews, error } = await supabase
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
        profile:profiles!reviews_user_id_fkey (
          user_id,
          username,
          display_name,
          avatar_url,
          reviews_count,
          is_top_reviewer,
          badges_count
        ),
        business:businesses (
          id,
          name,
          category,
          primary_category,
          location,
          city,
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
      console.error('[Recent Reviews] Error fetching reviews:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to match expected format
    const transformedReviews = (reviews || []).map((review: any) => {
      const profile = review.profile;
      const business = review.business;

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
          name: profile?.display_name || profile?.username || 'Anonymous',
          username: profile?.username,
          profilePicture: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.display_name || 'User')}&background=random`,
          reviewCount: profile?.reviews_count || 0,
          rating: 4.5, // Could calculate this if needed
          badge: profile?.is_top_reviewer ? 'top' as const : undefined,
          badgesCount: profile?.badges_count || 0,
          location: 'Cape Town'
        },
        businessName: business?.name || 'Unknown Business',
        businessType: business?.primary_category || business?.category || 'Unknown',
        businessId: business?.id
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
