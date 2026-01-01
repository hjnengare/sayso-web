import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';

type RouteContext = {
  params: Promise<{ id?: string }>;
};

/**
 * GET /api/saved/businesses
 * List user's saved businesses (paginated)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to view saved businesses' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const sortBy = searchParams.get('sort_by') || 'created_at'; // 'created_at' or 'name'
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('saved_businesses')
      .select(`
        id,
        user_id,
        business_id,
        created_at,
        updated_at,
        businesses (
          id,
          name,
          description,
          category,
          interest_id,
          sub_interest_id,
          location,
          address,
          phone,
          email,
          website,
          image_url,
          uploaded_images,
          verified,
          price_range,
          badge,
          slug,
          created_at,
          updated_at
        )
      `, { count: 'exact' })
      .eq('user_id', user.id);

    // Apply sorting
    if (sortBy === 'name') {
      query = query.order('created_at', { ascending: false }); // We'll sort by business name in the response
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: savedRecords, error: savedError, count } = await query;

    if (savedError) {
      console.error('Error fetching saved businesses:', {
        message: savedError.message,
        code: savedError.code,
        details: savedError.details,
        hint: savedError.hint,
      });
      
      // Check if table doesn't exist (42P01) or column doesn't exist (42703)
      if (savedError.code === '42P01' || savedError.code === '42703' || 
          savedError.message?.includes('relation') || 
          savedError.message?.includes('does not exist') ||
          savedError.message?.includes('column') ||
          savedError.message?.includes('undefined_column')) {
        return NextResponse.json(
          { 
            error: 'Database schema error',
            details: savedError.code === '42703' 
              ? 'A required column is missing. Please run database migrations.'
              : 'The saved_businesses table or a related table does not exist. Please run the database migration.',
            code: savedError.code,
            message: savedError.message
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch saved businesses', 
          details: savedError.message,
          code: savedError.code
        },
        { status: 500 }
      );
    }

    if (!savedRecords || savedRecords.length === 0) {
      return NextResponse.json({
        success: true,
        businesses: [],
        count: 0,
        total: 0,
        page,
        limit,
        totalPages: 0,
      });
    }

    // Get business IDs to fetch stats
    const businessIds = savedRecords
      .map((r: any) => r.businesses?.id)
      .filter((id: any) => id != null);

    // Fetch business stats
    let businessStatsMap = new Map();
    if (businessIds.length > 0) {
      const { data: statsData } = await supabase
        .from('business_stats')
        .select('business_id, total_reviews, average_rating, percentiles')
        .in('business_id', businessIds);
      
      if (statsData) {
        statsData.forEach((stat: any) => {
          businessStatsMap.set(stat.business_id, stat);
        });
      }
    }

    // Transform the data
    let businesses = savedRecords
      .map((savedRecord: any) => {
        const business = savedRecord.businesses;
        
        // Filter out null businesses (orphaned saved_businesses records)
        if (!business || !business.id) {
          console.warn('Saved business record has no associated business:', savedRecord.id);
          return null;
        }
        
        // Filter out businesses with missing critical data
        if (!business.name || business.name.trim() === '') {
          console.warn('Saved business has no name:', business.id);
          return null;
        }

        const stats = businessStatsMap.get(business.id);
        const averageRating = stats?.average_rating;
        const totalReviews = stats?.total_reviews || 0;
        const percentiles = stats?.percentiles;

        return {
          id: business.id,
          name: business.name.trim(),
          description: business.description || null,
          category: business.category || 'Uncategorized',
          interest_id: business.interest_id,
          sub_interest_id: business.sub_interest_id,
          location: business.location || business.address || 'Location not available',
          address: business.address || null,
          phone: business.phone || null,
          email: business.email || null,
          website: business.website || null,
          image_url: business.image_url || null,
          uploaded_images: business.uploaded_images || null,
          verified: business.verified || false,
          price_range: business.price_range || '$$',
          badge: business.badge || null,
          slug: business.slug || null,
          created_at: business.created_at,
          updated_at: business.updated_at,
          // Stats
          rating: averageRating || null,
          total_reviews: totalReviews,
          percentiles: percentiles || null,
          // Saved metadata
          saved_at: savedRecord.created_at,
          saved_id: savedRecord.id,
        };
      })
      .filter(Boolean);

    // Sort by name if requested
    if (sortBy === 'name') {
      businesses.sort((a: any, b: any) => a.name.localeCompare(b.name));
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      businesses,
      count: businesses.length,
      total: count || 0,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('Error in GET /api/saved/businesses:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/saved/businesses
 * Save business to user's list
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to save businesses' },
        { status: 401 }
      );
    }

    const { business_id } = await req.json();

    if (!business_id) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Check if business exists
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_businesses')
      .select('id')
      .eq('user_id', user.id)
      .eq('business_id', business_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { 
          success: true,
          message: 'Business already saved',
          isSaved: true
        },
        { status: 200 }
      );
    }

    // Save the business
    const { data: saved, error: saveError } = await supabase
      .from('saved_businesses')
      .insert({
        user_id: user.id,
        business_id: business_id,
      })
      .select()
      .single();

    if (saveError) {
      // Handle unique constraint violation (already saved)
      if (saveError.code === '23505') {
        return NextResponse.json(
          { 
            success: true,
            message: 'Business already saved',
            isSaved: true
          },
          { status: 200 }
        );
      }

      console.error('Error saving business:', saveError);
      return NextResponse.json(
        { error: 'Failed to save business', details: saveError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Business saved successfully',
      saved,
      isSaved: true,
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/saved/businesses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

