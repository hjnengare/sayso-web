import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/reviewers/[id]
 * Fetches detailed reviewer profile with reviews and stats
 * PUBLIC ENDPOINT - Uses service role for unauthenticated access
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    // Validate UUID format
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!UUID_REGEX.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

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

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        username,
        display_name,
        avatar_url,
        reviews_count,
        is_top_reviewer,
        badges_count,
        bio,
        created_at
      `)
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Reviewer not found' },
        { status: 404 }
      );
    }

    // Fetch user's reviews with business data
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        title,
        content,
        created_at,
        helpful_count,
        tags,
        business:businesses (
          id,
          name,
          category,
          primary_category
        ),
        review_images (
          image_url,
          alt_text
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Calculate stats
    const avgRating = reviews?.length
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
      : 0;

    const totalLikes = reviews?.reduce((acc, r) => acc + (r.helpful_count || 0), 0) || 0;

    // Fetch user's earned badges
    const { data: badgesData } = await supabase
      .from('user_badges')
      .select(`
        badge_id,
        awarded_at,
        badge:badges (
          id,
          name,
          description,
          icon,
          png_path
        )
      `)
      .eq('user_id', userId)
      .order('awarded_at', { ascending: false })
      .limit(10);

    const badges = (badgesData || [])
      .map((item: any) => ({
        id: item.badge?.id,
        name: item.badge?.name,
        icon: item.badge?.icon || item.badge?.png_path,
        description: item.badge?.description,
        earnedDate: new Date(item.awarded_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short'
        })
      }))
      .filter((b: any) => b.id);

    // Transform reviews
    const transformedReviews = (reviews || []).map((review: any) => ({
      id: review.id,
      businessName: review.business?.name || 'Unknown Business',
      businessType: review.business?.primary_category || review.business?.category || 'Business',
      rating: review.rating,
      text: review.content,
      date: new Date(review.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      likes: review.helpful_count || 0,
      tags: review.tags || [],
      images: review.review_images?.map((img: any) => img.image_url) || []
    }));

    // Build reviewer profile
    const reviewerProfile = {
      id: profile.user_id,
      name: profile.display_name || profile.username || 'Anonymous',
      username: profile.username,
      profilePicture: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name || 'User')}&background=random`,
      reviewCount: profile.reviews_count || 0,
      rating: Math.round(avgRating * 10) / 10,
      badge: profile.is_top_reviewer ? 'top' as const : undefined,
      location: 'Cape Town',
      bio: profile.bio,
      memberSince: new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      }),
      helpfulVotes: totalLikes,
      totalViews: profile.reviews_count * 15, // Estimate
      averageRating: Math.round(avgRating * 10) / 10,
      reviews: transformedReviews,
      badges: badges,
      badgesCount: profile.badges_count || 0
    };

    return NextResponse.json({
      ok: true,
      reviewer: reviewerProfile
    });

  } catch (error: any) {
    console.error('[Reviewer Profile] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviewer profile', message: error.message },
      { status: 500 }
    );
  }
}
