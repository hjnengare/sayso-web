import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';

/**
 * GET /api/user/saved
 * Get all saved businesses for the current user
 */
export async function GET(req: Request) {
  try {
    const supabase = await getServerSupabase();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to view saved businesses' },
        { status: 401 }
      );
    }

    // Fetch saved businesses with full business data
    const { data: savedBusinesses, error } = await supabase
      .from('saved_businesses')
      .select(`
        id,
        created_at,
        business:businesses!saved_businesses_business_id_fkey (
          id,
          name,
          description,
          category,
          location,
          address,
          phone,
          email,
          website,
          image_url,
          uploaded_image,
          verified,
          price_range,
          badge,
          slug,
          latitude,
          longitude,
          created_at,
          updated_at,
          business_stats (
            total_reviews,
            average_rating,
            percentiles
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      // Log detailed error information
      const errorDetails = {
        message: error.message || 'Unknown error',
        code: error.code || 'unknown',
        details: error.details || null,
        hint: error.hint || null,
      };
      
      // Check if it's a table/permission error
      const isTableError = error.code === '42P01' || // relation does not exist
                          error.code === '42501' || // insufficient privilege
                          error.message?.includes('relation') ||
                          error.message?.includes('does not exist');
      
      if (isTableError) {
        console.warn('Saved businesses table not accessible:', errorDetails);
      } else {
        console.error('Error fetching saved businesses:', errorDetails);
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch saved businesses',
          details: errorDetails.message,
          code: errorDetails.code
        },
        { status: 500 }
      );
    }

    // Transform the data to match BusinessCard format
    const businesses = (savedBusinesses || [])
      .map((saved: any) => {
        const business = saved.business;
        if (!business) return null;

        return {
          id: business.id,
          name: business.name,
          image: business.image_url || business.uploaded_image,
          alt: `${business.name} - ${business.category} in ${business.location}`,
          category: business.category,
          location: business.location,
          rating: business.business_stats?.[0]?.average_rating 
            ? Math.round((business.business_stats[0].average_rating * 2) / 2) 
            : undefined,
          totalRating: business.business_stats?.[0]?.average_rating,
          reviews: business.business_stats?.[0]?.total_reviews || 0,
          badge: business.verified && business.badge ? business.badge : undefined,
          href: `/business/${business.slug || business.id}`,
          verified: business.verified || false,
          priceRange: business.price_range || '$$',
          hasRating: (business.business_stats?.[0]?.average_rating || 0) > 0,
          percentiles: business.business_stats?.[0]?.percentiles,
          address: business.address,
          phone: business.phone,
          website: business.website,
          description: business.description,
          savedAt: saved.created_at,
        };
      })
      .filter(Boolean); // Remove any null entries

    return NextResponse.json({
      success: true,
      businesses,
      count: businesses.length,
    });
  } catch (error) {
    // Better error logging for unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error in saved businesses API:', {
      message: errorMessage,
      stack: errorStack,
      error,
    });
    
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/saved
 * Save a business for the current user
 */
export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();
    
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
      .single();

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
      // If it's a unique constraint violation, business is already saved
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
    });
  } catch (error) {
    console.error('Error in save business API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/saved
 * Unsave a business for the current user
 */
export async function DELETE(req: Request) {
  try {
    const supabase = await getServerSupabase();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to unsave businesses' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const business_id = searchParams.get('business_id');

    if (!business_id) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Delete the saved business
    const { error: deleteError } = await supabase
      .from('saved_businesses')
      .delete()
      .eq('user_id', user.id)
      .eq('business_id', business_id);

    if (deleteError) {
      console.error('Error unsaving business:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unsave business', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Business unsaved successfully',
      isSaved: false,
    });
  } catch (error) {
    console.error('Error in unsave business API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

