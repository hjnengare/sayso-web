import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { fetchBusinessOptimized } from '../../../lib/utils/optimizedQueries';
import { getDisplayUsername } from '../../../lib/utils/generateUsernameServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Use Node.js runtime to avoid Edge Runtime warnings with Supabase

/**
 * GET /api/businesses/[id]
 * Fetches a single business by ID with stats and reviews
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Cache disabled for now - always fetch fresh data
    // Use optimized fetch with parallel queries (no caching)
    try {
      const businessData = await fetchBusinessOptimized(businessId, req, false);
      
      // Transform to match expected response format
      const stats = businessData.stats;
      const response = {
        ...businessData,
        stats: stats || undefined,
        reviews: (businessData.reviews || []).map((review: any) => {
          // Handle profile - could be object, array, or undefined
          const profile = Array.isArray(review.profile) ? review.profile[0] : (review.profile || null);
          
          // Generate username using same logic as migration
          const author = getDisplayUsername(
            profile?.username,
            profile?.display_name,
            null, // Email not available in this context
            review.user_id
          );
          
          // Debug logging if author name is missing
          if (!author || author === 'User') {
            console.warn('[API] Review missing author name:', {
              review_id: review.id,
              user_id: review.user_id,
              profile,
            });
          }
          
          return {
            id: review.id,
            userId: review.user_id,
            author,
            rating: review.rating,
            text: review.content || review.title || '',
            date: new Date(review.created_at).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric'
            }),
            tags: review.tags || [],
            profileImage: profile?.avatar_url || '',
            reviewImages: review.images?.map((img: any) => {
              if (img.image_url) return img.image_url;
              if (img.storage_path) {
                // Use review_images bucket (matches upload bucket name)
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                return `${supabaseUrl}/storage/v1/object/public/review_images/${img.storage_path}`;
              }
              return null;
            }).filter(Boolean) || [],
            helpfulCount: review.helpful_count || 0,
          };
        }),
        images: (() => {
          const imageList: string[] = [];
          if (businessData.uploaded_image && businessData.uploaded_image.trim() !== '') {
            imageList.push(businessData.uploaded_image);
          }
          if (businessData.image_url && businessData.image_url.trim() !== '' && !imageList.includes(businessData.image_url)) {
            imageList.push(businessData.image_url);
          }
          return imageList.filter(img => img && img.trim() !== '');
        })(),
        trust: stats?.percentiles?.trustworthiness || 85,
        punctuality: stats?.percentiles?.punctuality || 85,
        friendliness: stats?.percentiles?.friendliness || 85,
      };

      // Return response without caching
      return NextResponse.json(response);
    } catch (optimizedError: any) {
      // Fallback to original implementation if optimized fetch fails
      console.warn('[API] Optimized fetch failed, falling back to standard query:', optimizedError);
    }

    // Fallback to original implementation
    const supabase = await getServerSupabase(req);

    // Try slug first, then ID fallback
    let actualBusinessId: string = businessId;
    let businessBySlug: any = null;

    // Try to find by slug first
    const { data: slugData, error: slugError } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', businessId)
      .single();

    if (slugData && slugData.id) {
      actualBusinessId = slugData.id;
    }

    // Fetch business with stats using actual ID
    const businessQuery = supabase
      .from('businesses')
      .select(`
        *,
        business_stats (
          total_reviews,
          average_rating,
          rating_distribution,
          percentiles
        )
      `)
      .eq('id', actualBusinessId)
      .single();

    // Fetch reviews for the business (limit to 10 initially for faster loading) - start in parallel
    const reviewsQuery = supabase
      .from('reviews')
      .select('id, user_id, business_id, rating, content, title, tags, created_at, helpful_count')
      .eq('business_id', actualBusinessId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Execute business and reviews queries in parallel
    const [businessResult, reviewsResult] = await Promise.all([
      businessQuery,
      reviewsQuery
    ]);

    const { data: business, error: businessError } = businessResult;
    const { data: reviews, error: reviewsError } = reviewsResult;

    if (businessError || !business) {
      if (businessError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        );
      }
      throw businessError || new Error('Business not found');
    }

    if (reviewsError) {
      console.error('[API] Error fetching reviews:', reviewsError);
    }

    // Fetch review images and profiles in parallel if we have reviews
    let reviewImagesMap: Record<string, any[]> = {};
    let reviewsWithProfiles = [];
    
    if (reviews && reviews.length > 0) {
      const reviewIds = reviews.map((r: any) => r.id);
      const userIds = [...new Set(reviews.map((r: any) => r.user_id))];

      // Execute images and profiles queries in parallel
      // Optimize: Only fetch necessary fields and limit images per review
      const [imagesResult, profilesResult] = await Promise.all([
        supabase
          .from('review_images')
          .select('review_id, image_url')
          .in('review_id', reviewIds)
          .order('created_at', { ascending: true })
          .limit(100), // Limit total images to prevent large payloads
        supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', userIds)
      ]);

      const { data: reviewImages, error: imagesError } = imagesResult;
      const { data: profiles, error: profilesError } = profilesResult;

      if (imagesError) {
        console.error('[API] Error fetching review images:', imagesError);
      } else if (reviewImages) {
        // Group images by review_id
        reviewImages.forEach((img: any) => {
          if (!reviewImagesMap[img.review_id]) {
            reviewImagesMap[img.review_id] = [];
          }
          reviewImagesMap[img.review_id].push(img);
        });
      }

      if (profilesError) {
        console.error('[API] Error fetching profiles:', profilesError);
      }

      // Join reviews with profiles and images
      reviewsWithProfiles = reviews.map((review: any) => {
        const profile = profiles?.find((p: any) => p.user_id === review.user_id);
        const images = reviewImagesMap[review.id] || [];
        return {
          ...review,
          profiles: profile || null,
          review_images: images,
        };
      });
    }

      // Transform the data for the frontend
    const stats = business.business_stats?.[0];
    const response = {
      ...business,
      stats: stats || undefined,
      reviews: (reviewsWithProfiles || []).map((review: any) => {
        // Handle profiles - it might be an array or object depending on join type
        const profile = Array.isArray(review.profiles) ? review.profiles[0] : (review.profiles || null);
        
        // Generate username using same logic as migration
        const author = getDisplayUsername(
          profile?.username,
          profile?.display_name,
          null, // Email not available in this context
          review.user_id
        );
        
        // Debug logging if author name is missing
        if (!author || author === 'User') {
          console.warn('[API] Review missing author name (fallback path):', {
            review_id: review.id,
            user_id: review.user_id,
            has_profile: !!profile,
            profile,
          });
        }
        
        return {
          id: review.id,
          userId: review.user_id,
          author,
          rating: review.rating,
          text: review.content || review.title || '',
          date: new Date(review.created_at).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
          }),
          tags: review.tags || [],
          profileImage: profile?.avatar_url || '',
          reviewImages: review.review_images?.map((img: any) => {
            // Use image_url if available, otherwise construct from storage_path
            if (img.image_url) return img.image_url;
            if (img.storage_path) {
              // Construct public URL from storage path - use review_images bucket (matches upload)
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
              return `${supabaseUrl}/storage/v1/object/public/review_images/${img.storage_path}`;
            }
            return null;
          }).filter(Boolean) || [],
          helpfulCount: review.helpful_count || 0,
        };
      }),
      // Format images array for carousel - filter out empty strings and null values
      images: (() => {
        const imageList: string[] = [];
        if (business.uploaded_image && business.uploaded_image.trim() !== '') {
          imageList.push(business.uploaded_image);
        }
        if (business.image_url && business.image_url.trim() !== '' && !imageList.includes(business.image_url)) {
          imageList.push(business.image_url);
        }
        return imageList.filter(img => img && img.trim() !== '');
      })(),
      // Calculate metrics from percentiles if available
      trust: stats?.percentiles?.trustworthiness || 85,
      punctuality: stats?.percentiles?.punctuality || 85,
      friendliness: stats?.percentiles?.friendliness || 85,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API] Error fetching business:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/businesses/[id]
 * Updates a business (requires business owner authentication)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;
    const supabase = await getServerSupabase(req);

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns this business
    const { data: ownerCheck, error: ownerError } = await supabase
      .from('business_owners')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .single();

    if (ownerError || !ownerCheck) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this business' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      name,
      description,
      category,
      address,
      phone,
      email,
      website,
      priceRange,
      hours,
    } = body;

    // Build update object (only include fields that are provided)
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (priceRange !== undefined) updateData.price_range = priceRange;
    // Store hours as JSON if provided
    if (hours !== undefined) {
      updateData.hours = hours; // Assuming hours is stored as JSONB
    }

    // Update business
    const { data: updatedBusiness, error: updateError } = await supabase
      .from('businesses')
      .update(updateData)
      .eq('id', businessId)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error updating business:', updateError);
      return NextResponse.json(
        { error: 'Failed to update business', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      business: updatedBusiness,
    });
  } catch (error: any) {
    console.error('[API] Error updating business:', error);
    return NextResponse.json(
      { error: 'Failed to update business', details: error.message },
      { status: 500 }
    );
  }
}

