import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { fetchCapeTownBusinesses } from '../../../lib/services/overpassService';
import { mapOSMToBusiness, generateInitialStats } from '../../../lib/utils/osmToBusinessMapper';
import { getSubcategorySlugForOsmCategory } from '../../../lib/utils/osmCategoryToSlug';
import { getInterestIdForSubcategory, LEGACY_TRAVEL_SUBCATEGORY_MAP } from '../../../lib/onboarding/subcategoryMapping';
import { SUBCATEGORY_SLUG_TO_LABEL } from '../../../utils/subcategoryPlaceholders';

export const dynamic = 'force-dynamic';
export const maxDuration = 180; // Overpass API can be slow (3 minutes)

/**
 * POST /api/businesses/seed
 * Seeds businesses from Overpass API into the database
 */
export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();
    
    // Check if user is authenticated (optional - remove if you want public seeding)
    const { data: { user } } = await supabase.auth.getUser();
    
    // Optional: restrict to admin users only
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
    const body = await req.json().catch(() => ({}));
    const MAX_TOTAL_BUSINESSES = 100000;
    const requestedLimit = Number.isFinite(body.limit) ? Math.floor(body.limit) : undefined;
    const limit = Math.min(
      Math.max(requestedLimit ?? MAX_TOTAL_BUSINESSES, 1),
      MAX_TOTAL_BUSINESSES
    );
    const rawSubcategory = body.subcategory || body.category || undefined; // Support both for backward compatibility
    const normalizedKey = typeof rawSubcategory === 'string'
      ? rawSubcategory.trim().toLowerCase()
      : undefined;
    const subcategory = normalizedKey
      ? LEGACY_TRAVEL_SUBCATEGORY_MAP[normalizedKey] ?? normalizedKey
      : undefined;
    const dryRun = body.dryRun === true; // Don't actually insert if true
    
    // Define all subcategories from subcategories page
    const ALL_SUBCATEGORIES = [
      // Food & Drink
      'restaurants', 'cafes', 'bars', 'fast-food', 'fine-dining',
      // Beauty & Wellness
      'gyms', 'spas', 'salons', 'wellness', 'nail-salons',
      // Professional Services
      'education-learning', 'transport-travel', 'finance-insurance', 'plumbers', 'electricians', 'legal-services',
      // Travel
      'accommodation', 'transport', 'travel-services',
      // Outdoors & Adventure
      'hiking', 'cycling', 'water-sports', 'camping',
      // Entertainment & Experiences
      'events-festivals', 'sports-recreation', 'nightlife', 'comedy-clubs',
      // Arts & Culture
      'museums', 'galleries', 'theaters', 'concerts',
      // Family & Pets
      'family-activities', 'pet-services', 'childcare', 'veterinarians',
      // Shopping & Lifestyle
      'fashion', 'electronics', 'home-decor', 'books',
    ];
    
    // If no subcategory specified, seed from all subcategories
    const subcategoriesToSeed = subcategory 
      ? [subcategory] 
      : ALL_SUBCATEGORIES;
    
    console.log(`[SEED] Fetching up to ${limit} businesses from ${subcategoriesToSeed.length} subcategory/subcategories...`);
    
    // Fetch businesses from all specified subcategories
    let allBusinesses: any[] = [];
    
    for (let i = 0; i < subcategoriesToSeed.length; i++) {
      const subcat = subcategoriesToSeed[i];
      const remaining = limit - allBusinesses.length;
      if (remaining <= 0) {
        break;
      }
      const subcategoriesRemaining = subcategoriesToSeed.length - i;
      const businessesPerSubcategory = subcategoriesRemaining <= 1
        ? remaining
        : Math.max(1, Math.ceil(remaining / subcategoriesRemaining));
      
      // Add delay between requests to avoid rate limiting (except for first request)
      if (i > 0) {
        const delay = 2000; // 2 seconds between requests
        console.log(`[SEED] Waiting ${delay / 1000} seconds before next request...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      try {
        console.log(`[SEED] Fetching up to ${businessesPerSubcategory} businesses for subcategory: ${subcat} (${i + 1}/${subcategoriesToSeed.length})`);
        const subcategoryBusinesses = await fetchCapeTownBusinesses(businessesPerSubcategory, subcat);
        allBusinesses = allBusinesses.concat(subcategoryBusinesses);
        
        // Stop if we've reached the limit
        if (allBusinesses.length >= limit) {
          break;
        }
      } catch (error: any) {
        console.warn(`[SEED] Failed to fetch businesses for subcategory ${subcat}:`, error.message);
        // Continue with other subcategories
      }
    }
    
    // Limit to the requested amount
    const osmBusinesses = allBusinesses.slice(0, limit);
    
    if (osmBusinesses.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No businesses found in Cape Town',
        count: 0,
      });
    }
    
    console.log(`[SEED] Fetched ${osmBusinesses.length} businesses from Overpass API`);
    
    // Helper function to generate deterministic slug using name and source ID
    const generateUniqueSlug = (name: string, sourceId: string): string => {
      const baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const sourceHashBase = sourceId
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      const prefix = sourceHashBase.slice(0, 4);
      const suffix = sourceHashBase.slice(-4);
      const hashSegment = `${prefix}${suffix}`.replace(/[^a-z0-9]/g, '') || 'entry';

      const slugParts = [baseSlug || 'business', hashSegment]
        .map(part => part.replace(/(^-|-$)/g, ''))
        .filter(Boolean);

      return slugParts.join('-').replace(/-{2,}/g, '-').replace(/(^-|-$)/g, '');
    };

    // Map OSM businesses to our Business format
    const mappedBusinesses = osmBusinesses.map((osmBusiness) => {
      const businessData = mapOSMToBusiness(osmBusiness);
      
      // Generate source and source_id for idempotent upserts
      const source = 'overpass';
      const source_id = osmBusiness.id; // e.g., "osm-node-123"
      
      // Generate slug to prevent collisions
      const slug = generateUniqueSlug(businessData.name, source_id);
      
      return {
        ...businessData,
        slug,
        source,
        source_id,
        status: 'active',
        // Don't set id - let database generate UUID
        // Don't set created_at/updated_at - let database handle timestamps
      };
    });
    
    // Deduplicate businesses by source+source_id (in case OSM returns duplicates)
    // Use a Map to keep track of the first occurrence of each source+source_id
    const seen = new Map<string, number>();
    const uniqueBusinesses: typeof mappedBusinesses = [];
    
    mappedBusinesses.forEach((business, index) => {
      const key = `${business.source || 'unknown'}:${business.source_id || 'unknown'}`;
      
      if (seen.has(key)) {
        const duplicateIndex = seen.get(key)!;
        console.warn(`[SEED] Skipping duplicate business: ${business.name} (${key}) - duplicate of index ${duplicateIndex}`);
        return; // Skip this duplicate
      }
      
      // Mark this as seen and add to unique list
      seen.set(key, index);
      uniqueBusinesses.push(business);
    });
    
    console.log(`[SEED] Deduplicated ${mappedBusinesses.length} businesses to ${uniqueBusinesses.length} unique businesses`);
    
    // Additional validation: ensure no duplicate source+source_id in final list
    const finalCheck = new Set<string>();
    const duplicates = uniqueBusinesses.filter(business => {
      const key = `${business.source || 'unknown'}:${business.source_id || 'unknown'}`;
      if (finalCheck.has(key)) {
        return true; // This is a duplicate
      }
      finalCheck.add(key);
      return false;
    });
    
    if (duplicates.length > 0) {
      console.error(`[SEED] ERROR: Found ${duplicates.length} duplicates after deduplication!`);
      duplicates.forEach(dup => {
        console.error(`[SEED] Duplicate: ${dup.name} - ${dup.source}:${dup.source_id}`);
      });
      // Remove duplicates
      const trulyUnique = uniqueBusinesses.filter(business => {
        const key = `${business.source || 'unknown'}:${business.source_id || 'unknown'}`;
        return !duplicates.some(d => 
          d.source === business.source && d.source_id === business.source_id
        );
      });
      console.log(`[SEED] Removed ${duplicates.length} duplicates, final count: ${trulyUnique.length}`);
      uniqueBusinesses.length = 0;
      uniqueBusinesses.push(...trulyUnique);
    }
    
    // Determine which businesses already exist in the database to avoid re-inserting them
    const sourceIds = uniqueBusinesses
      .map(business => business.source_id)
      .filter((id): id is string => Boolean(id));

    const existingSourceIds = new Set<string>();
    const lookupBatchSize = 500;

    for (let i = 0; i < sourceIds.length; i += lookupBatchSize) {
      const batchIds = sourceIds.slice(i, i + lookupBatchSize);
      if (batchIds.length === 0) {
        continue;
      }

      const { data: existingBatch, error: existingBatchError } = await supabase
        .from('businesses')
        .select('source_id')
        .eq('source', 'overpass')
        .in('source_id', batchIds);

      if (existingBatchError) {
        console.warn('[SEED] Warning: Failed to check existing businesses batch:', existingBatchError.message);
        continue;
      }

      (existingBatch || []).forEach((record: { source_id: string | null }) => {
        if (record?.source_id) {
          existingSourceIds.add(record.source_id);
        }
      });
    }

    const businessesToInsert = uniqueBusinesses.filter(business => !existingSourceIds.has(business.source_id));
    const alreadyExistingCount = uniqueBusinesses.length - businessesToInsert.length;

    console.log(`[SEED] ${businessesToInsert.length} new businesses to insert (${alreadyExistingCount} already existed in database)`);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: 'Dry run - no businesses inserted',
        count: businessesToInsert.length,
        alreadyExists: alreadyExistingCount,
        fetched: osmBusinesses.length,
        businesses: businessesToInsert.map(b => {
          const slug = getSubcategorySlugForOsmCategory(b.category ?? '', b.name);
          return {
            name: b.name,
            primary_subcategory_slug: slug,
            primary_category_slug: getInterestIdForSubcategory(slug) ?? undefined,
            location: b.address,
          };
        }),
      });
    }

    if (businessesToInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new businesses to insert',
        count: 0,
        alreadyExists: alreadyExistingCount,
        fetched: osmBusinesses.length,
      });
    }

    // Insert businesses into database in batches to avoid timeout and handle errors better
    let insertedBusinesses: any[] = [];
    let insertError: any = null;
    
    const batchSize = 100; // Insert in batches of 100
    console.log(`[SEED] Inserting ${businessesToInsert.length} businesses in batches of ${batchSize}...`);
    
    for (let i = 0; i < businessesToInsert.length; i += batchSize) {
      const rawBatch = businessesToInsert.slice(i, i + batchSize);
      const batch = rawBatch.map((b: Record<string, unknown>) => {
        const categoryLabel = (b.category as string) ?? '';
        const slug = getSubcategorySlugForOsmCategory(categoryLabel, b.name as string);
        const { category, ...rest } = b;
        return {
          ...rest,
          primary_subcategory_slug: slug,
          primary_subcategory_label: (SUBCATEGORY_SLUG_TO_LABEL[slug as keyof typeof SUBCATEGORY_SLUG_TO_LABEL] ?? categoryLabel) || 'Miscellaneous',
          primary_category_slug: getInterestIdForSubcategory(slug) ?? null,
        };
      });
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(businessesToInsert.length / batchSize);

      console.log(`[SEED] Inserting batch ${batchNumber}/${totalBatches} (${batch.length} businesses)...`);

      const { data: batchData, error: batchError } = await supabase
        .from('businesses')
        .insert(batch)
        .select();
      
      if (batchError) {
        console.error(`[SEED] Error inserting batch ${batchNumber}:`, batchError);
        // Log which businesses in the batch have issues
        if (batchError.code === '23505') { // Unique constraint violation
          console.error(`[SEED] Duplicate key error in batch ${batchNumber}. Checking for duplicates...`);
          // Check for duplicates in this batch
          const batchKeys = new Set<string>();
          batch.forEach((b: Record<string, unknown>, idx: number) => {
            const key = `${b.source}:${b.source_id}`;
            if (batchKeys.has(key)) {
              console.error(`[SEED] Duplicate in batch ${batchNumber} at index ${idx}: ${b.name} - ${key}`);
            } else {
              batchKeys.add(key);
            }
          });
        }
        insertError = batchError;
        // Continue with next batch instead of failing completely
        continue;
      } else if (batchData) {
        insertedBusinesses = insertedBusinesses.concat(batchData);
        console.log(`[SEED] Successfully inserted batch ${batchNumber}/${totalBatches} (${batchData.length} businesses)`);
      }
    }
    
    if (insertedBusinesses.length > 0) {
      console.log(`[SEED] Successfully inserted ${insertedBusinesses.length} out of ${businessesToInsert.length} businesses`);
      if (insertError) {
        console.warn('[SEED] Insert completed with some errors. Check logs above for details.');
      }
    } else if (insertError) {
      console.error('[SEED] Failed to insert any businesses:', insertError);
    }
    
    if (insertError && insertedBusinesses.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to insert businesses', 
          details: insertError.message,
        },
        { status: 500 }
      );
    }
    
    if (!insertedBusinesses || insertedBusinesses.length === 0) {
      return NextResponse.json(
        { 
          error: 'No businesses were inserted', 
          message: 'Check database connection and schema',
        },
        { status: 500 }
      );
    }
    
    console.log(`[SEED] Successfully inserted ${insertedBusinesses.length} businesses`);
    
    // Create initial stats for each business
    const statsToInsert = (insertedBusinesses || []).map(business => {
      const stats = generateInitialStats();
      return {
        business_id: business.id,
        ...stats,
        updated_at: new Date().toISOString(),
      };
    });
    
    if (statsToInsert.length > 0) {
      const { error: statsError } = await supabase
        .from('business_stats')
        .upsert(statsToInsert, {
          onConflict: 'business_id',
        });
      
      if (statsError) {
        console.error('[SEED] Error inserting business stats:', statsError);
        // Don't fail the request if stats insertion fails
      } else {
        console.log(`[SEED] Inserted stats for ${statsToInsert.length} businesses`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${insertedBusinesses?.length || 0} businesses`,
      count: insertedBusinesses?.length || 0,
      alreadyExists: alreadyExistingCount,
      fetched: osmBusinesses.length,
      businesses: insertedBusinesses?.map(b => ({
        id: b.id,
        name: b.name,
        category: b.category,
        location: b.location,
      })),
    });
  } catch (error: any) {
    console.error('[SEED] Error seeding businesses:', error);
    return NextResponse.json(
      { error: 'Failed to seed businesses', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/businesses/seed
 * Preview businesses that would be seeded (dry run)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const MAX_TOTAL_BUSINESSES = 100000;
    const parsedLimit = parseInt(searchParams.get('limit') || `${MAX_TOTAL_BUSINESSES}`, 10);
    const limit = Math.min(
      Math.max(Number.isFinite(parsedLimit) ? parsedLimit : MAX_TOTAL_BUSINESSES, 1),
      MAX_TOTAL_BUSINESSES
    );
    const rawSubcategory = searchParams.get('subcategory') || searchParams.get('category') || undefined;
    const normalizedKey = rawSubcategory ? rawSubcategory.trim().toLowerCase() : undefined;
    const subcategory = normalizedKey
      ? LEGACY_TRAVEL_SUBCATEGORY_MAP[normalizedKey] ?? normalizedKey
      : undefined;
    
    // Define all subcategories from subcategories page
    const ALL_SUBCATEGORIES = [
      // Food & Drink
      'restaurants', 'cafes', 'bars', 'fast-food', 'fine-dining',
      // Beauty & Wellness
      'gyms', 'spas', 'salons', 'wellness', 'nail-salons',
      // Professional Services
      'education-learning', 'transport-travel', 'finance-insurance', 'plumbers', 'electricians', 'legal-services',
      // Travel
      'accommodation', 'transport', 'travel-services',
      // Outdoors & Adventure
      'hiking', 'cycling', 'water-sports', 'camping',
      // Entertainment & Experiences
      'events-festivals', 'sports-recreation', 'nightlife', 'comedy-clubs',
      // Arts & Culture
      'museums', 'galleries', 'theaters', 'concerts',
      // Family & Pets
      'family-activities', 'pet-services', 'childcare', 'veterinarians',
      // Shopping & Lifestyle
      'fashion', 'electronics', 'home-decor', 'books',
    ];
    
    // If no subcategory specified, preview from all subcategories
    const subcategoriesToPreview = subcategory 
      ? [subcategory] 
      : ALL_SUBCATEGORIES;
    
    console.log(`[SEED PREVIEW] Fetching up to ${limit} businesses from ${subcategoriesToPreview.length} subcategory/subcategories...`);
    
    // Fetch businesses from all specified subcategories
    let allBusinesses: any[] = [];
    
    for (let i = 0; i < subcategoriesToPreview.length; i++) {
      const subcat = subcategoriesToPreview[i];
      const remaining = limit - allBusinesses.length;
      if (remaining <= 0) {
        break;
      }
      const subcategoriesRemaining = subcategoriesToPreview.length - i;
      const businessesPerSubcategory = subcategoriesRemaining <= 1
        ? remaining
        : Math.max(1, Math.ceil(remaining / subcategoriesRemaining));
      
      // Add delay between requests to avoid rate limiting (except for first request)
      if (i > 0) {
        const delay = 2000; // 2 seconds between requests
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      try {
        console.log(`[SEED PREVIEW] Fetching up to ${businessesPerSubcategory} businesses for subcategory: ${subcat} (${i + 1}/${subcategoriesToPreview.length})`);
        const subcategoryBusinesses = await fetchCapeTownBusinesses(businessesPerSubcategory, subcat);
        allBusinesses = allBusinesses.concat(subcategoryBusinesses);
        
        // Stop if we've reached the limit
        if (allBusinesses.length >= limit) {
          break;
        }
      } catch (error: any) {
        console.warn(`[SEED PREVIEW] Failed to fetch businesses for subcategory ${subcat}:`, error.message);
        // Continue with other subcategories
      }
    }
    
    // Limit to the requested amount
    const osmBusinesses = allBusinesses.slice(0, limit);
    
    return NextResponse.json({
      success: true,
      message: `Found ${osmBusinesses.length} businesses (preview)`,
      count: osmBusinesses.length,
      businesses: osmBusinesses.map(b => ({
        name: b.name,
        category: b.category,
        address: b.address,
        phone: b.phone,
        website: b.website,
        latitude: b.latitude,
        longitude: b.longitude,
      })),
    });
  } catch (error: any) {
    console.error('[SEED PREVIEW] Error:', error);
    return NextResponse.json(
      { error: 'Failed to preview businesses', details: error.message },
      { status: 500 }
    );
  }
}

