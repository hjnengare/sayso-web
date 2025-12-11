/**
 * Maps Foursquare API business data to our Business type and upserts to database
 */

import { getServerSupabase } from '../supabase/server';
import { createClient } from '@supabase/supabase-js';

// Foursquare API types (updated for new Places API)
export interface FsqPlace {
  fsq_place_id: string; // Updated: fsq_id → fsq_place_id in new API
  name: string;
  geocodes?: {
    main?: {
      latitude?: number;
      longitude?: number;
    };
  };
  location?: {
    address?: string;
    locality?: string;
    region?: string;
    postcode?: string;
    country?: string;
    formatted_address?: string;
  };
  categories?: Array<{
    id: number;
    name: string;
    short_name?: string;
    plural_name?: string;
    icon?: {
      prefix: string;
      suffix: string;
    };
  }>;
}

export interface FsqDetails {
  price?: number; // 1-4 scale
  tel?: string;
  website?: string;
  hours?: {
    display?: string;
    open_now?: boolean;
    regular?: Array<{
      day: number;
      start: string;
      end: string;
    }>;
  };
  hours_popular?: {
    display?: string;
    open_now?: boolean;
    regular?: Array<{
      day: number;
      start: string;
      end: string;
    }>;
  };
}

/**
 * Generates a South African-style description for a business
 */
export function generateDescription(opts: {
  name: string;
  primaryCategory: string;
  locationString: string | null;
  subcategoryLabel: string;
}): string {
  const { primaryCategory, locationString, subcategoryLabel } = opts;

  const categoryText = primaryCategory?.toLowerCase() || "spot";
  const locText = locationString || "Cape Town";
  const subcat = subcategoryLabel.toLowerCase();

  // South African, authentic, warm, minimal cringe
  const templates = [
    `A ${categoryText} in ${locText}, known for its lekker vibe and reliable ${subcat}.`,
    `A proper local ${categoryText} in ${locText}, where people often pull in for quality ${subcat}.`,
    `A familiar ${categoryText} around ${locText}, offering a solid experience for anyone keen on ${subcat}.`,
    `A well-loved ${categoryText} in ${locText}, with a vibe that keeps locals coming back for ${subcat}.`,
    `A go-to ${categoryText} in ${locText}, carrying that clean South African feel and dependable ${subcat}.`,
    `A chilled ${categoryText} in ${locText}, lekker for anyone looking for good ${subcat} without the fuss.`,
    `A popular ${categoryText} in ${locText}, known for consistent service and a proper SA atmosphere for ${subcat}.`,
    `A local favourite in ${locText}, offering a simple, honest experience for ${subcat}.`,
    `A solid ${categoryText} based in ${locText}, where people pull through for trustworthy ${subcat}.`,
    `A classic ${categoryText} in ${locText}, keeping things real with no-frills, quality ${subcat}.`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Maps Foursquare price value (1-4) to our price range format
 */
function mapPriceRange(price?: number): '$' | '$$' | '$$$' | '$$$$' {
  if (!price || price < 1 || price > 4) {
    return '$$'; // Default to mid-range
  }
  
  switch (price) {
    case 1:
      return '$';
    case 2:
      return '$$';
    case 3:
      return '$$$';
    case 4:
      return '$$$$';
    default:
      return '$$';
  }
}

/**
 * Builds a location string from Foursquare location data
 */
function buildLocationString(loc: FsqPlace['location']): string | null {
  if (!loc) return null;
  
  // Try formatted_address first
  if (loc.formatted_address) {
    return loc.formatted_address;
  }
  
  // Build from components
  const parts: string[] = [];
  
  if (loc.address) parts.push(loc.address);
  if (loc.locality) parts.push(loc.locality);
  if (loc.region) parts.push(loc.region);
  if (loc.postcode) parts.push(loc.postcode);
  if (loc.country && loc.country !== 'ZA') parts.push(loc.country);
  
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Upserts a business from Foursquare data into the database
 * 
 * @param place - Foursquare place data
 * @param details - Optional Foursquare details (price, hours, contact info)
 * @param photoUrl - Optional photo URL from Foursquare
 * @param interestId - Interest ID (slug) to tag this business with
 * @param subInterestId - Sub-interest ID (slug) to tag this business with
 * @param subcategoryLabel - Optional subcategory label for description generation
 * @param supabaseClient - Optional Supabase client (for script execution)
 */
export async function upsertBusinessFromFsq(
  place: FsqPlace,
  details: FsqDetails | null,
  photoUrl: string | null,
  interestId: string,
  subInterestId: string,
  subcategoryLabel?: string,
  supabaseClient?: ReturnType<typeof createClient>
) {
  // Use provided client or get server client (for Next.js API routes)
  const supabase = supabaseClient || await getServerSupabase();
  
  const geocode = place.geocodes?.main;
  const loc = place.location ?? {};
  const categories = place.categories ?? [];
  const primaryCategory = categories[0]?.name ?? 'Unknown';
  const categoryRaw = categories.map(c => c.name).join('|') || null;

  const priceRange = mapPriceRange(details?.price) ?? '$$'; // Default to $$

  const locationString = buildLocationString(loc) || loc.address || 'Unknown';

  // Generate description if subcategory label is provided
  const description = subcategoryLabel
    ? generateDescription({
        name: place.name,
        primaryCategory,
        locationString,
        subcategoryLabel,
      })
    : null;

  // 👇 IMPORTANT: we DO NOT include `uploaded_image` in this payload
  // and we only include `image_url` if we have a real Foursquare photo.
  const payload: Record<string, any> = {
    // required / core
    name: place.name,
    description,
    category: primaryCategory,
    location: locationString,

    // optional fields
    address: loc.address ?? null,
    phone: details?.tel ?? null,
    email: null, // FSQ doesn't provide email
    website: details?.website ?? null,

    // Only set this if we actually have a FSQ photo
    ...(photoUrl ? { image_url: photoUrl } : {}),

    // DO NOT TOUCH uploaded_image – your app handles that from uploads
    // uploaded_image: undefined,

    verified: false,
    price_range: priceRange,
    status: 'active',
    badge: null,
    owner_id: null,
    slug: null, // let your app generate slug later
    lat: geocode?.latitude ?? null,
    lng: geocode?.longitude ?? null,
    source: 'foursquare',
    source_id: place.fsq_place_id, // Updated for new API: fsq_id → fsq_place_id
    owner_verified: false,
    owner_verification_requested_at: null,
    owner_verification_method: null,
    owner_verification_notes: null,
    geo_point: null, // trigger will populate from lat/lng
    sub_interest_id: subInterestId,
    interest_id: interestId,
    category_raw: categoryRaw,
    hours: details?.hours ?? details?.hours_popular ?? null,
  };

  const { data, error } = await supabase
    .from('businesses')
    .upsert(payload, {
      onConflict: 'source,source_id',
    })
    .select();

  if (error) {
    console.error('Supabase upsert error for', place.fsq_place_id, error);
  } else if (data && data[0]) {
    console.log('Saved business:', data[0].name);
  }
}

