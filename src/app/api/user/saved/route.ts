import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { normalizeBusinessImages } from '../../../lib/utils/businessImages';
import { getCategoryLabelFromBusiness } from '../../../utils/subcategoryPlaceholders';

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

    // Fetch saved businesses with full business data using relationship query
    // This uses Supabase's foreign key relationship to join businesses in one query
    console.log('GET /api/user/saved - Fetching saved businesses for user:', {
      user_id: user.id,
      user_email: user.email
    });
    
    // Use relationship query: select businesses(*) to get full business data via foreign key
    const { data: savedRecords, error: savedError } = await supabase
      .from('saved_businesses')
      .select(`
        id,
        created_at,
        businesses (
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
          verified,
          price_range,
          badge,
          slug,
          created_at,
          updated_at,
          business_images (
            id,
            url,
            type,
            sort_order,
            is_primary
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    console.log('GET /api/user/saved - Saved records query result:', { 
      count: savedRecords?.length || 0,
      error: savedError ? {
        message: savedError.message,
        code: savedError.code,
        details: savedError.details,
        hint: savedError.hint
      } : null
    });

    if (savedError) {
      // Log detailed error information
      const errorDetails = {
        message: savedError.message || 'Unknown error',
        code: savedError.code || 'unknown',
        details: savedError.details || null,
        hint: savedError.hint || null,
      };
      
      // Check if it's a table/permission error
      const isTableError = savedError.code === '42P01' || // relation does not exist
                          savedError.code === '42501' || // insufficient privilege
                          savedError.message?.includes('relation') ||
                          savedError.message?.includes('does not exist') ||
                          savedError.message?.includes('foreign key');
      
      if (isTableError) {
        console.warn('Saved businesses table or relationship not accessible:', errorDetails);
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

    if (!savedRecords || savedRecords.length === 0) {
      console.log('GET /api/user/saved - No saved businesses found for user:', user.id);
      return NextResponse.json({
        success: true,
        businesses: [],
        count: 0,
      });
    }

    // Try to fetch business stats separately (business_stats might be a view/table)
    const businessIds = savedRecords
      .map((r: any) => r.businesses?.id)
      .filter((id: any) => id != null);
    
    let businessStatsMap = new Map();
    if (businessIds.length > 0) {
      try {
        const { data: statsData } = await supabase
          .from('business_stats')
          .select('business_id, total_reviews, average_rating, percentiles')
          .in('business_id', businessIds);
        
        if (statsData) {
          statsData.forEach((stat: any) => {
            businessStatsMap.set(stat.business_id, stat);
          });
        }
      } catch (statsError) {
        // business_stats might not exist or be accessible - that's okay
        console.warn('Could not fetch business stats (non-critical):', statsError);
      }
    }

    // Transform the data to match BusinessCard format
    const businesses = savedRecords
      .map((savedRecord: any) => {
        const business = savedRecord.businesses;
        if (!business) return null;

        // Get stats from the map we fetched separately
        const stats = businessStatsMap.get(business.id);
        const averageRating = stats?.average_rating;
        const totalReviews = stats?.total_reviews || 0;
        const percentiles = stats?.percentiles;

        // Normalize business_images to uploaded_images format
        const { uploaded_images, cover_image } = normalizeBusinessImages(business);
        const displayCategory = getCategoryLabelFromBusiness(business);

        return {
          id: business.id,
          name: business.name,
          image: cover_image || (uploaded_images && uploaded_images.length > 0 ? uploaded_images[0] : null) || business.image_url || null,
          alt: `${business.name} - ${displayCategory} in ${business.location}`,
          category: displayCategory,
          location: business.location,
          rating: averageRating 
            ? Math.round((averageRating * 2) / 2) 
            : undefined,
          totalRating: averageRating,
          reviews: totalReviews,
          badge: business.verified && business.badge ? business.badge : undefined,
          href: `/business/${business.slug || business.id}`,
          verified: business.verified || false,
          priceRange: business.price_range || '$$',
          hasRating: (averageRating || 0) > 0,
          percentiles: percentiles,
          address: business.address,
          phone: business.phone,
          website: business.website,
          description: business.description,
          savedAt: savedRecord.created_at,
        };
      })
      .filter(Boolean); // Remove any null entries

    console.log('GET /api/user/saved - Returning businesses:', {
      count: businesses.length,
      businessIds: businesses.map((b: any) => b.id)
    });

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
    const { data: existing, error: existingError } = await supabase
      .from('saved_businesses')
      .select('id')
      .eq('user_id', user.id)
      .eq('business_id', business_id)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing saved business:', {
        message: existingError.message,
        code: existingError.code,
        userId: user.id,
        businessId: business_id
      });
    }

    if (existing) {
      console.log('Business already saved:', { user_id: user.id, business_id, existing_id: existing.id });
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
    console.log('POST /api/user/saved - Attempting to save business:', { 
      user_id: user.id, 
      business_id,
      user_email: user.email 
    });
    
    // First, verify we can read from the table (RLS check)
    const { data: testRead, error: testReadError } = await supabase
      .from('saved_businesses')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    
    if (testReadError) {
      console.warn('POST /api/user/saved - Warning: Cannot read from saved_businesses table (RLS issue?):', {
        message: testReadError.message,
        code: testReadError.code,
        hint: testReadError.hint
      });
    } else {
      console.log('POST /api/user/saved - RLS read test passed, can read', testRead?.length || 0, 'existing records');
    }
    
    const { data: saved, error: saveError } = await supabase
      .from('saved_businesses')
      .insert({
        user_id: user.id,
        business_id: business_id,
      })
      .select()
      .single();

    if (saveError) {
      // Log detailed error information
      const errorDetails = {
        message: saveError.message || 'Unknown error',
        code: saveError.code || 'unknown',
        details: saveError.details || null,
        hint: saveError.hint || null,
      };
      
      // If it's a unique constraint violation, business is already saved
      if (saveError.code === '23505') {
        console.log('Business already saved (unique constraint):', { user_id: user.id, business_id });
        return NextResponse.json(
          { 
            success: true,
            message: 'Business already saved',
            isSaved: true
          },
          { status: 200 }
        );
      }

      // Check if it's a table/permission error
      const isTableError = saveError.code === '42P01' || // relation does not exist
                          saveError.code === '42501' || // insufficient privilege
                          saveError.message?.includes('relation') ||
                          saveError.message?.includes('does not exist') ||
                          saveError.message?.includes('permission denied') ||
                          saveError.message?.includes('new row violates row-level security');

      if (isTableError) {
        console.error('Saved businesses table error:', errorDetails);
        return NextResponse.json(
          { 
            error: 'Saved businesses feature is not available. The table may not exist or you may not have permission.',
            details: errorDetails.message,
            code: errorDetails.code
          },
          { status: 500 }
        );
      }

      console.error('Error saving business:', errorDetails);
      return NextResponse.json(
        { 
          error: 'Failed to save business', 
          details: errorDetails.message,
          code: errorDetails.code
        },
        { status: 500 }
      );
    }

    if (!saved) {
      console.error('Insert succeeded but no data returned:', { user_id: user.id, business_id });
      return NextResponse.json(
        { 
          error: 'Business saved but confirmation failed',
          details: 'Insert succeeded but no data was returned'
        },
        { status: 500 }
      );
    }

    // Verify the record was actually saved by querying it back
    // Add a small delay to ensure transaction is committed (especially for RLS policies)
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const { data: verifySaved, error: verifyError } = await supabase
      .from('saved_businesses')
      .select('id, user_id, business_id, created_at')
      .eq('user_id', user.id)
      .eq('business_id', business_id)
      .maybeSingle();

    if (verifyError) {
      console.error('Error verifying saved business:', {
        message: verifyError.message,
        code: verifyError.code,
        details: verifyError.details,
        hint: verifyError.hint,
        userId: user.id,
        businessId: business_id
      });
      
      // If verification fails but insert succeeded, still return success
      // The record might exist but RLS might prevent reading it immediately
      // This is a known issue with Supabase RLS and immediate reads after insert
      console.warn('Verification query failed, but insert succeeded. Record may exist but RLS prevented read:', {
        user_id: user.id,
        business_id,
        saved_record: saved
      });
      
      // Return success with the saved record from insert
      return NextResponse.json({
        success: true,
        message: 'Business saved successfully',
        saved: saved,
        isSaved: true,
        warning: 'Verification query failed, but insert succeeded'
      });
    }

    if (!verifySaved) {
      console.error('CRITICAL: Business insert reported success but record not found in database:', {
        user_id: user.id,
        business_id,
        saved_record: saved
      });
      
      // Even if verification fails, if insert succeeded, return success
      // The record exists but might not be immediately readable due to RLS timing
      console.warn('Record not found in verification query, but insert succeeded. Returning success with insert data.');
      return NextResponse.json({
        success: true,
        message: 'Business saved successfully',
        saved: saved,
        isSaved: true,
        warning: 'Verification query returned no results, but insert succeeded'
      });
    }

    console.log('Business saved and verified successfully:', { 
      user_id: user.id, 
      business_id, 
      saved_id: saved.id,
      verified_id: verifySaved.id,
      created_at: verifySaved.created_at
    });

    return NextResponse.json({
      success: true,
      message: 'Business saved successfully',
      saved: verifySaved,
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

