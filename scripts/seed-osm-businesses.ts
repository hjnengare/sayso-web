/**
 * OSM (Overpass API) Business Seeding Script
 * 
 * Seeds businesses from OpenStreetMap Overpass API into the database, automatically
 * tagging them with the correct interest_id and sub_interest_id based on
 * the subcategory config.
 * 
 * Usage:
 *   npx tsx scripts/seed-osm-businesses.ts
 * 
 * Environment variables required:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchCapeTownBusinesses, OverpassBusiness } from '../src/app/lib/services/overpassService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n💡 Make sure these are set in your .env file');
  throw new Error('Missing required environment variables');
}

// Create Supabase client for script execution
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 🧩 Subcategory-to-OSM mapping with your actual interest/sub-interest IDs
// Based on your interests and subcategories from /api/subcategories
interface SubcategoryConfig {
  label: string;
  subcategoryId: string; // OSM subcategory ID (e.g., 'cafes', 'restaurants')
  interestId: string;
  subInterestId: string;
}

const SUBCATEGORY_CONFIGS: SubcategoryConfig[] = [
  // Food & Drink
  {
    label: 'Restaurants',
    subcategoryId: 'restaurants',
    interestId: 'food-drink',
    subInterestId: 'restaurants',
  },
  {
    label: 'Cafés & Coffee',
    subcategoryId: 'cafes',
    interestId: 'food-drink',
    subInterestId: 'cafes',
  },
  {
    label: 'Bars & Pubs',
    subcategoryId: 'bars',
    interestId: 'food-drink',
    subInterestId: 'bars',
  },
  {
    label: 'Fast Food',
    subcategoryId: 'fast-food',
    interestId: 'food-drink',
    subInterestId: 'fast-food',
  },
  {
    label: 'Fine Dining',
    subcategoryId: 'fine-dining',
    interestId: 'food-drink',
    subInterestId: 'fine-dining',
  },

  // Beauty & Wellness
  {
    label: 'Gyms & Fitness',
    subcategoryId: 'gyms',
    interestId: 'beauty-wellness',
    subInterestId: 'gyms',
  },
  {
    label: 'Spas',
    subcategoryId: 'spas',
    interestId: 'beauty-wellness',
    subInterestId: 'spas',
  },
  {
    label: 'Hair Salons',
    subcategoryId: 'salons',
    interestId: 'beauty-wellness',
    subInterestId: 'salons',
  },
  {
    label: 'Wellness Centers',
    subcategoryId: 'wellness',
    interestId: 'beauty-wellness',
    subInterestId: 'wellness',
  },
  {
    label: 'Nail Salons',
    subcategoryId: 'nail-salons',
    interestId: 'beauty-wellness',
    subInterestId: 'nail-salons',
  },

  // Professional Services
  {
    label: 'Education & Learning',
    subcategoryId: 'education-learning',
    interestId: 'professional-services',
    subInterestId: 'education-learning',
  },
  {
    label: 'Transport & Travel',
    subcategoryId: 'transport-travel',
    interestId: 'professional-services',
    subInterestId: 'transport-travel',
  },
  {
    label: 'Finance & Insurance',
    subcategoryId: 'finance-insurance',
    interestId: 'professional-services',
    subInterestId: 'finance-insurance',
  },
  {
    label: 'Plumbers',
    subcategoryId: 'plumbers',
    interestId: 'professional-services',
    subInterestId: 'plumbers',
  },
  {
    label: 'Electricians',
    subcategoryId: 'electricians',
    interestId: 'professional-services',
    subInterestId: 'electricians',
  },
  {
    label: 'Legal Services',
    subcategoryId: 'legal-services',
    interestId: 'professional-services',
    subInterestId: 'legal-services',
  },

  // Outdoors & Adventure
  {
    label: 'Hiking',
    subcategoryId: 'hiking',
    interestId: 'outdoors-adventure',
    subInterestId: 'hiking',
  },
  {
    label: 'Cycling',
    subcategoryId: 'cycling',
    interestId: 'outdoors-adventure',
    subInterestId: 'cycling',
  },
  {
    label: 'Water Sports',
    subcategoryId: 'water-sports',
    interestId: 'outdoors-adventure',
    subInterestId: 'water-sports',
  },
  {
    label: 'Camping',
    subcategoryId: 'camping',
    interestId: 'outdoors-adventure',
    subInterestId: 'camping',
  },

  // Entertainment & Experiences
  {
    label: 'Events & Festivals',
    subcategoryId: 'events-festivals',
    interestId: 'experiences-entertainment',
    subInterestId: 'events-festivals',
  },
  {
    label: 'Sports & Recreation',
    subcategoryId: 'sports-recreation',
    interestId: 'experiences-entertainment',
    subInterestId: 'sports-recreation',
  },
  {
    label: 'Nightlife',
    subcategoryId: 'nightlife',
    interestId: 'experiences-entertainment',
    subInterestId: 'nightlife',
  },
  {
    label: 'Comedy Clubs',
    subcategoryId: 'comedy-clubs',
    interestId: 'experiences-entertainment',
    subInterestId: 'comedy-clubs',
  },
  {
    label: 'Cinemas',
    subcategoryId: 'cinemas',
    interestId: 'experiences-entertainment',
    subInterestId: 'cinemas',
  },

  // Arts & Culture
  {
    label: 'Museums',
    subcategoryId: 'museums',
    interestId: 'arts-culture',
    subInterestId: 'museums',
  },
  {
    label: 'Art Galleries',
    subcategoryId: 'galleries',
    interestId: 'arts-culture',
    subInterestId: 'galleries',
  },
  {
    label: 'Theaters',
    subcategoryId: 'theaters',
    interestId: 'arts-culture',
    subInterestId: 'theaters',
  },
  {
    label: 'Concerts',
    subcategoryId: 'concerts',
    interestId: 'arts-culture',
    subInterestId: 'concerts',
  },

  // Family & Pets
  {
    label: 'Family Activities',
    subcategoryId: 'family-activities',
    interestId: 'family-pets',
    subInterestId: 'family-activities',
  },
  {
    label: 'Pet Services',
    subcategoryId: 'pet-services',
    interestId: 'family-pets',
    subInterestId: 'pet-services',
  },
  {
    label: 'Childcare',
    subcategoryId: 'childcare',
    interestId: 'family-pets',
    subInterestId: 'childcare',
  },
  {
    label: 'Veterinarians',
    subcategoryId: 'veterinarians',
    interestId: 'family-pets',
    subInterestId: 'veterinarians',
  },

  // Shopping & Lifestyle
  {
    label: 'Fashion & Clothing',
    subcategoryId: 'fashion',
    interestId: 'shopping-lifestyle',
    subInterestId: 'fashion',
  },
  {
    label: 'Electronics',
    subcategoryId: 'electronics',
    interestId: 'shopping-lifestyle',
    subInterestId: 'electronics',
  },
  {
    label: 'Home Decor',
    subcategoryId: 'home-decor',
    interestId: 'shopping-lifestyle',
    subInterestId: 'home-decor',
  },
  {
    label: 'Books & Media',
    subcategoryId: 'books',
    interestId: 'shopping-lifestyle',
    subInterestId: 'books',
  },
];

// --- Helper Functions ---

/**
 * Generates a simple description from business data
 */
function generateDescription(
  name: string,
  category: string,
  location: string,
  subcategoryLabel: string
): string {
  return `${name} is a ${category.toLowerCase()} in ${location} with a focus on ${subcategoryLabel.toLowerCase()}.`;
}

/**
 * Maps OSM price range to our format
 */
function mapPriceRange(tags: Record<string, string>): '$' | '$$' | '$$$' | '$$$$' {
  // Check for explicit price information
  if (tags['price_range']) {
    const price = tags['price_range'].trim();
    if (price.startsWith('$')) {
      return price as '$' | '$$' | '$$$' | '$$$$';
    }
  }

  // Infer from business type
  if (tags.amenity === 'fast_food' || tags.shop === 'supermarket') {
    return '$';
  }

  if (tags.amenity === 'restaurant' || tags.amenity === 'cafe') {
    // Check cuisine or other indicators
    if (tags.cuisine) {
      // Premium cuisines tend to be pricier
      if (['fine_dining', 'french', 'italian', 'japanese'].includes(tags.cuisine)) {
        return '$$$';
      }
      return '$$';
    }
    return '$$';
  }

  if (tags.amenity === 'bar' || tags.amenity === 'pub') {
    return '$$';
  }

  if (tags.tourism === 'hotel') {
    return '$$$';
  }

  // Default to mid-range
  return '$$';
}

/**
 * Extracts location/suburb from address string
 */
function extractLocation(address?: string): string | null {
  if (!address) return null;
  
  // Try to extract suburb name (common in Cape Town addresses)
  const suburbMatch = address.match(/(?:,|^)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:,|$)/);
  if (suburbMatch && suburbMatch[1]) {
    // Filter out common non-suburb words
    const suburb = suburbMatch[1].trim();
    const skipWords = ['Cape', 'Town', 'Western', 'Cape', 'South', 'Africa', 'Street', 'Road', 'Avenue', 'Drive'];
    if (!skipWords.includes(suburb)) {
      return suburb;
    }
  }
  
  // Fallback: try to get area after city
  const parts = address.split(',').map(p => p.trim());
  if (parts.length > 1) {
    // Second to last part is often the suburb
    const suburb = parts[parts.length - 2];
    if (suburb && !suburb.match(/^\d{4}$/)) { // Skip postcodes
      return suburb;
    }
  }
  
  return null;
}

// --- Upsert Function ---

async function upsertBusinessFromOSM(
  osmBusiness: OverpassBusiness,
  interestId: string,
  subInterestId: string,
  subcategoryLabel: string,
  supabaseClient: any
) {
  const lat = osmBusiness.latitude;
  const lng = osmBusiness.longitude;
  const rawAddress = osmBusiness.address || null;

  // Extract location from address
  const locationString = extractLocation(rawAddress || undefined) || 'Cape Town';
  const finalLocationString = locationString;

  // Use raw OSM data
  const businessName = osmBusiness.name;
  const primaryCategory = osmBusiness.category || 'Business';
  const finalAddress = rawAddress;

  // Extract contact info from OSM tags
  const phone =
    osmBusiness.phone ??
    osmBusiness.tags['phone'] ??
    osmBusiness.tags['contact:phone'] ??
    null;
  const email =
    osmBusiness.tags['email'] ??
    osmBusiness.tags['contact:email'] ??
    null;
  const website =
    osmBusiness.website ??
    osmBusiness.tags['website'] ??
    osmBusiness.tags['contact:website'] ??
    osmBusiness.tags['url'] ??
    null;

  // Extract opening hours from OSM
  const openingHoursRaw =
    osmBusiness.tags['opening_hours'] ??
    osmBusiness.tags['opening_hours:covid19'] ??
    null;

  const hours: { raw: string | null; friendly: string | null } | null = openingHoursRaw
    ? { raw: openingHoursRaw, friendly: null }
    : null;

  // Generate simple description
  const description = generateDescription(
    businessName,
    primaryCategory,
    finalLocationString,
    subcategoryLabel
  );

  const priceRange = mapPriceRange(osmBusiness.tags);

  const payload: Record<string, any> = {
    name: businessName,
    description,
    category: primaryCategory,
    location: finalLocationString,
    address: finalAddress,
    phone,
    email,
    website,
    verified: false,
    price_range: priceRange,
    status: 'active',
    badge: null,
    owner_id: null,
    slug: null,
    lat: lat ?? null,
    lng: lng ?? null,
    source: 'overpass',
    source_id: osmBusiness.id, // OSM ID format: "osm-node-123" or "osm-way-456"
    owner_verified: false,
    owner_verification_requested_at: null,
    owner_verification_method: null,
    owner_verification_notes: null,
    geo_point: null,
    sub_interest_id: subInterestId,
    interest_id: interestId,
    category_raw: null, // OSM doesn't have category_raw
    hours, // JSONB: { raw, friendly } or null
  };

  // Manual upsert: Check if exists, then update or insert
  // This works around Supabase's onConflict not recognizing partial unique indexes
  const { data: existing } = await supabaseClient
    .from('businesses')
    .select('id')
    .eq('source', 'overpass')
    .eq('source_id', osmBusiness.id)
    .maybeSingle();

  let result: any;
  if (existing && (existing as any).id) {
    // Update existing business
    result = await (supabaseClient as any)
      .from('businesses')
      .update(payload)
      .eq('id', (existing as any).id)
      .select();
  } else {
    // Insert new business
    result = await (supabaseClient as any)
      .from('businesses')
      .insert(payload)
      .select();
  }

  if (result.error) {
    console.error('Supabase upsert error for', osmBusiness.id, result.error);
  } else if (result.data && result.data[0]) {
    console.log('Saved business:', result.data[0].name);
  }
}

// --- Main runner ---

async function run() {
  console.log('🚀 Starting OSM business seeding for Cape Town...\n');

  let totalProcessed = 0;
  let totalSaved = 0;

  for (const config of SUBCATEGORY_CONFIGS) {
    console.log(`\n=== Seeding: ${config.label} (${config.subcategoryId}) ===`);
    console.log(`  Interest: ${config.interestId}`);
    console.log(`  Sub-Interest: ${config.subInterestId}`);

    try {
      // Fetch businesses from OSM Overpass API
      const businesses = await fetchCapeTownBusinesses(50, config.subcategoryId);
      console.log(`  Found ${businesses.length} places for "${config.subcategoryId}"`);

      for (const business of businesses) {
        console.log(`  Processing: ${business.name}`);

        try {
          await upsertBusinessFromOSM(
            business,
            config.interestId,
            config.subInterestId,
            config.label,
            supabase as any
          );

          totalProcessed++;
          totalSaved++;
        } catch (error) {
          console.error(`  ❌ Error processing ${business.name}:`, error);
          totalProcessed++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`  ❌ Error fetching places for "${config.subcategoryId}":`, error);
    }

    // Delay between subcategories to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000)); // OSM API is slower, use 2s delay
  }

  console.log(`\n✅ Done seeding Cape Town businesses!`);
  console.log(`   Total processed: ${totalProcessed}`);
  console.log(`   Total saved: ${totalSaved}`);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

