/**
 * Service to fetch business data from Overpass API (OpenStreetMap)
 */

export interface OSMNode {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags: Record<string, string>;
}

export interface OSMResponse {
  version: number;
  generator: string;
  elements: OSMNode[];
}

export interface OverpassBusiness {
  id: string;
  name: string;
  category: string;
  address?: string;
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  tags: Record<string, string>;
}

interface OSMTagFilters {
  amenity?: string[];
  shop?: string[];
  tourism?: string[];
  railway?: string[];
  aeroway?: string[];
  office?: string[];
}

// Mapping from subcategories to OSM tags
export const SUBCATEGORY_TO_OSM_TAGS: Record<string, OSMTagFilters> = {
  // Food & Drink subcategories
  'restaurants': {
    amenity: ['restaurant', 'bistro'],
  },
  'cafes': {
    amenity: ['cafe', 'coffee_shop'],
  },
  'bars': {
    amenity: ['bar', 'pub'],
  },
  'fast-food': {
    amenity: ['fast_food', 'food_court', 'ice_cream'],
  },
  'fine-dining': {
    amenity: ['restaurant'], // Fine dining is typically tagged as restaurant with cuisine tags
  },
  
  // Beauty & Wellness subcategories
  'gyms': {
    amenity: ['gym', 'fitness_center'],
  },
  'spas': {
    amenity: ['spa', 'massage'],
  },
  'salons': {
    amenity: ['beauty_salon', 'hairdresser'],
    shop: ['hairdresser'],
  },
  'wellness': {
    amenity: ['spa', 'yoga', 'massage'],
  },
  'nail-salons': {
    amenity: ['nail_salon'],
  },
  
  // Professional Services subcategories
  'education-learning': {
    amenity: ['school', 'kindergarten', 'university', 'college', 'library'],
  },
  'transport-travel': {
    amenity: ['taxi', 'bus_station', 'car_rental', 'bicycle_rental'],
    shop: ['travel_agency'],
  },
  'finance-insurance': {
    amenity: ['bank', 'atm', 'insurance'],
    shop: ['insurance'],
  },
  'plumbers': {
    amenity: [], // Professional services may not have specific OSM tags
    shop: ['plumber'],
  },
  'electricians': {
    amenity: [],
    shop: ['electrician'],
  },
  'legal-services': {
    amenity: ['lawyer'],
  },

  // Travel subcategories
  'accommodation': {
    tourism: ['hotel', 'hostel', 'guest_house', 'motel'],
  },
  'transport': {
    amenity: ['taxi', 'bus_station', 'car_rental'],
    railway: ['station'],
    aeroway: ['aerodrome'],
  },
  'airports': {
    aeroway: ['aerodrome', 'terminal'],
  },
  'train-stations': {
    railway: ['station'],
  },
  'bus-stations': {
    amenity: ['bus_station'],
  },
  'car-rental-businesses': {
    amenity: ['car_rental'],
  },
  'campervan-rentals': {
    tourism: ['caravan_site'],
    amenity: ['car_rental'],
  },
  'shuttle-services': {
    amenity: ['taxi', 'bus_station'],
  },
  'chauffeur-services': {
    amenity: ['taxi'],
  },
  'travel-services': {
    shop: ['travel_agency'],
    tourism: ['information'],
  },
  'tour-guides': {
    tourism: ['information'],
  },
  'travel-agencies': {
    shop: ['travel_agency'],
  },
  'luggage-shops': {
    shop: ['bag', 'luggage'],
  },
  'travel-insurance-providers': {
    office: ['insurance'],
    shop: ['insurance'],
  },
  
  // Outdoors & Adventure subcategories
  'hiking': {
    tourism: ['attraction'],
  },
  'cycling': {
    amenity: ['bicycle_rental'],
  },
  'water-sports': {
    amenity: ['boat_rental'],
    tourism: ['attraction'],
  },
  'camping': {
    tourism: ['camp_site', 'caravan_site'],
  },
  
  // Entertainment & Experiences subcategories
  'events-festivals': {
    amenity: ['community_centre', 'arts_centre'],
    tourism: ['attraction'],
  },
  'sports-recreation': {
    amenity: ['sports_centre', 'stadium'],
    tourism: ['attraction'],
  },
  'nightlife': {
    amenity: ['nightclub', 'bar', 'pub', 'casino'],
  },
  'comedy-clubs': {
    amenity: ['nightclub', 'theatre'],
  },
  
  // Arts & Culture subcategories
  'museums': {
    tourism: ['museum'],
  },
  'galleries': {
    tourism: ['gallery', 'artwork'],
    shop: ['art'],
  },
  'theaters': {
    amenity: ['theatre', 'cinema'],
  },
  'concerts': {
    amenity: ['music_venue', 'arts_centre'],
  },
  
  // Family & Pets subcategories
  'family-activities': {
    tourism: ['zoo', 'aquarium', 'theme_park', 'attraction'],
    amenity: ['playground'],
  },
  'pet-services': {
    shop: ['pet'],
  },
  'childcare': {
    amenity: ['childcare', 'kindergarten'],
  },
  'veterinarians': {
    amenity: ['veterinary'],
  },
  
  // Shopping & Lifestyle subcategories
  'fashion': {
    shop: ['clothes', 'fashion', 'jewelry', 'shoes', 'bag', 'boutique'],
  },
  'electronics': {
    shop: ['electronics', 'mobile_phone', 'computer'],
  },
  'home-decor': {
    shop: ['homeware', 'furniture', 'florist', 'gift'],
  },
  'books': {
    shop: ['books'],
    amenity: ['library'],
  },
};

// Category mapping from OSM tags to our business categories
const OSM_CATEGORY_MAP: Record<string, string> = {
  'restaurant': 'Restaurant',
  'fast_food': 'Fast Food',
  'cafe': 'Coffee Shop',
  'coffee_shop': 'Coffee Shop',
  'bar': 'Bar',
  'pub': 'Bar',
  'bakery': 'Bakery',
  'ice_cream': 'Ice Cream',
  'food': 'Restaurant',
  'supermarket': 'Supermarket',
  'grocery': 'Grocery',
  'clothing': 'Clothing',
  'fashion': 'Clothing',
  'jewelry': 'Jewelry',
  'florist': 'Florist',
  'beauty_salon': 'Salon',
  'hairdresser': 'Salon',
  'nail_salon': 'Salon',
  'spa': 'Wellness',
  'gym': 'Fitness',
  'fitness_center': 'Fitness',
  'yoga': 'Wellness',
  'bookshop': 'Bookstore',
  'books': 'Bookstore',
  'library': 'Bookstore',
  'museum': 'Museum',
  'art_gallery': 'Art Gallery',
  'theatre': 'Theater',
  'cinema': 'Cinema',
  'music_venue': 'Music Venue',
  'nightclub': 'Nightclub',
  'pharmacy': 'Pharmacy',
  'hospital': 'Hospital',
  'clinic': 'Clinic',
  'dentist': 'Dental',
  'veterinary': 'Veterinary',
  'bank': 'Bank',
  'atm': 'ATM',
  'insurance': 'Insurance',
  'travel_agency': 'Travel Agency',
  'car_rental': 'Car Rental',
  'bus_station': 'Bus Station',
  'taxi': 'Chauffeur Service',
  'station': 'Train Station',
  'train_station': 'Train Station',
  'aerodrome': 'Airport',
  'airport': 'Airport',
  'terminal': 'Airport',
  'hotel': 'Accommodation',
  'hostel': 'Accommodation',
  'guest_house': 'Accommodation',
  'motel': 'Accommodation',
  'caravan_site': 'Campervan Rental',
  'information': 'Travel Service',
  'luggage': 'Luggage Shop',
  'bag': 'Luggage Shop',
  'fuel': 'Gas Station',
  'parking': 'Parking',
  'tourist_attraction': 'Attraction',
  'park': 'Park',
  'zoo': 'Zoo',
  'aquarium': 'Aquarium',
  // Electronics & Telecom
  'mobile_phone': 'Electronics',
  'electronics': 'Electronics',
  'computer': 'Electronics',
  'telecommunication': 'Electronics',
  'phone': 'Electronics',
  'telecom': 'Electronics',
};

// Default categories for unmapped OSM types
// Using 'Business' which maps to 'electronics' subcategory (shopping bag icon)
const DEFAULT_CATEGORY = 'Business';

/**
 * Fetches businesses from Overpass API for Cape Town area
 * @param limit - Maximum number of businesses to return
 * @param subcategory - Subcategory ID (e.g., 'restaurants', 'cafes', 'gyms') to filter by
 */
export async function fetchCapeTownBusinesses(
  limit: number = 100,
  subcategory?: string
): Promise<OverpassBusiness[]> {
  // Cape Town bounding box (approximate)
  // Format: south,west,north,east
  // South: -34.1, North: -33.8, West: 18.3, East: 18.7
  const bbox = '-34.1,18.3,-33.8,18.7';
  
  try {
    // For simplicity, we'll use a bounding box query
    // Overpass QL bbox syntax: (south,west,north,east)
    // Cape Town approximate bounds: south=-34.1, west=18.3, north=-33.8, east=18.7
    // Parse bbox into components
    const [south, west, north, east] = bbox.split(',').map(Number);
    
    // Helper function to process OSM response
    function processOSMResponse(data: OSMResponse, limit: number): OverpassBusiness[] {
      // Transform OSM elements to businesses
      const businesses: OverpassBusiness[] = [];
      
      for (const element of data.elements) {
      // Skip if no name
      if (!element.tags.name) {
        continue;
      }
      
      // Get coordinates
      // Get coordinates - ways don't have direct lat/lon, need to use center or nodes
      let lat: number | undefined;
      let lon: number | undefined;
      
      if (element.type === 'node') {
        lat = element.lat;
        lon = element.lon;
      } else if (element.type === 'way' || element.type === 'relation') {
        // Ways and relations may have center coordinates in tags
        if (element.tags['lat'] && element.tags['lon']) {
          lat = parseFloat(element.tags['lat']);
          lon = parseFloat(element.tags['lon']);
        } else if (element.lat && element.lon) {
          // Some APIs return center coordinates directly
          lat = element.lat;
          lon = element.lon;
        }
      }
      
      // Determine category from tags and name
      const category = determineCategory(element.tags, element.tags.name);
      
      // Build address from tags
      const address = buildAddress(element.tags);
      
      businesses.push({
        id: `osm-${element.type}-${element.id}`,
        name: element.tags.name,
        category,
        address: address || undefined,
        phone: element.tags.phone || element.tags['phone:mobile'] || undefined,
        website: element.tags.website || element.tags['contact:website'] || undefined,
        latitude: lat,
        longitude: lon,
        tags: element.tags,
      });
      
        // Limit results
        if (businesses.length >= limit) {
          break;
        }
      }
      
      return businesses;
    }
    
    // Build Overpass query based on subcategory
    let finalQuery: string;
    
    if (subcategory && SUBCATEGORY_TO_OSM_TAGS[subcategory]) {
      // Filter by specific subcategory
      const tags = SUBCATEGORY_TO_OSM_TAGS[subcategory];
      const queries: string[] = [];

      // Build queries for each supported tag key.
      const keyMappings: Array<[keyof OSMTagFilters, string]> = [
        ['amenity', 'amenity'],
        ['shop', 'shop'],
        ['tourism', 'tourism'],
        ['railway', 'railway'],
        ['aeroway', 'aeroway'],
        ['office', 'office'],
      ];

      keyMappings.forEach(([property, overpassKey]) => {
        const values = tags[property];
        if (!values || values.length === 0) return;
        values.forEach(tag => {
          queries.push(`node["${overpassKey}"="${tag}"](${south},${west},${north},${east});`);
          queries.push(`way["${overpassKey}"="${tag}"](${south},${west},${north},${east});`);
        });
      });
      
      if (queries.length === 0) {
        // Fallback to general query if no tags found
        finalQuery = `
          [out:json][timeout:180];
          (
            node["amenity"](${south},${west},${north},${east});
            way["amenity"](${south},${west},${north},${east});
            node["shop"](${south},${west},${north},${east});
            way["shop"](${south},${west},${north},${east});
            node["tourism"](${south},${west},${north},${east});
            way["tourism"](${south},${west},${north},${east});
            node["railway"](${south},${west},${north},${east});
            way["railway"](${south},${west},${north},${east});
            node["aeroway"](${south},${west},${north},${east});
            way["aeroway"](${south},${west},${north},${east});
            node["office"](${south},${west},${north},${east});
            way["office"](${south},${west},${north},${east});
          );
          out center meta;
        `;
      } else {
        finalQuery = `
          [out:json][timeout:180];
          (
            ${queries.join('\n            ')}
          );
          out center meta;
        `;
      }
    } else {
      // General query for all businesses (no category filter)
      finalQuery = `
        [out:json][timeout:180];
        (
          node["amenity"](${south},${west},${north},${east});
          way["amenity"](${south},${west},${north},${east});
          node["shop"](${south},${west},${north},${east});
          way["shop"](${south},${west},${north},${east});
          node["tourism"](${south},${west},${north},${east});
          way["tourism"](${south},${west},${north},${east});
          node["railway"](${south},${west},${north},${east});
          way["railway"](${south},${west},${north},${east});
          node["aeroway"](${south},${west},${north},${east});
          way["aeroway"](${south},${west},${north},${east});
          node["office"](${south},${west},${north},${east});
          way["office"](${south},${west},${north},${east});
        );
        out center meta;
      `;
    }
    
    // Retry logic for Overpass API (can be slow or rate-limited)
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
        
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `data=${encodeURIComponent(finalQuery)}`,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`Overpass API error (${response.status}): ${errorText}`);
        }
        
        const data: OSMResponse = await response.json();
        
        // If successful, return data
        return processOSMResponse(data, limit);
      } catch (err: any) {
        lastError = err;
        
        // Check if it's a timeout or abort
        if (err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('gateway timeout')) {
          console.warn(`[Overpass] Timeout on attempt ${attempt + 1}/${maxRetries}`);
          if (attempt < maxRetries - 1) {
            // Wait before retry (exponential backoff)
            const waitTime = (attempt + 1) * 2000; // 2s, 4s, 6s
            console.log(`[Overpass] Retrying in ${waitTime / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        // Check for rate limiting (429)
        if (err.message?.includes('429') || err.message?.includes('rate limit')) {
          console.warn(`[Overpass] Rate limited on attempt ${attempt + 1}/${maxRetries}`);
          if (attempt < maxRetries - 1) {
            // Longer wait for rate limits
            const waitTime = (attempt + 1) * 5000; // 5s, 10s, 15s
            console.log(`[Overpass] Rate limited, waiting ${waitTime / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        // If last attempt or non-retryable error, throw
        if (attempt === maxRetries - 1) {
          throw err;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Should not reach here, but just in case
    if (lastError) {
      throw lastError;
    }
    
    throw new Error('Failed to fetch from Overpass API after retries');
  } catch (error) {
    console.error('Error fetching businesses from Overpass API:', error);
    throw error;
  }
}

/**
 * Determines business category from OSM tags and business name
 */
function determineCategory(tags: Record<string, string>, businessName?: string): string {
  // Check amenity tag
  if (tags.amenity && OSM_CATEGORY_MAP[tags.amenity]) {
    return OSM_CATEGORY_MAP[tags.amenity];
  }
  
  // Check shop tag
  if (tags.shop && OSM_CATEGORY_MAP[tags.shop]) {
    return OSM_CATEGORY_MAP[tags.shop];
  }
  
  // Check tourism tag
  if (tags.tourism && OSM_CATEGORY_MAP[tags.tourism]) {
    return OSM_CATEGORY_MAP[tags.tourism];
  }

  // Check railway tag
  if (tags.railway && OSM_CATEGORY_MAP[tags.railway]) {
    return OSM_CATEGORY_MAP[tags.railway];
  }

  // Check aeroway tag
  if (tags.aeroway && OSM_CATEGORY_MAP[tags.aeroway]) {
    return OSM_CATEGORY_MAP[tags.aeroway];
  }

  // Check office tag
  if (tags.office && OSM_CATEGORY_MAP[tags.office]) {
    return OSM_CATEGORY_MAP[tags.office];
  }
  
  // Check cuisine tag for restaurants
  if (tags.cuisine) {
    return 'Restaurant';
  }
  
  // Use business name hints for better categorization
  if (businessName) {
    const nameLower = businessName.toLowerCase();
    
    // Telecom/Electronics hints
    if (nameLower.includes('cell') || nameLower.includes('mobile') || 
        nameLower.includes('vodacom') || nameLower.includes('mtn') || 
        nameLower.includes('telkom') || nameLower.includes('telecom') ||
        nameLower.includes('phone') || nameLower.includes('cellular')) {
      return 'Electronics';
    }
    
    // Restaurant/Food hints
    if (nameLower.includes('restaurant') || nameLower.includes('cafe') || 
        nameLower.includes('bistro') || nameLower.includes('diner') ||
        nameLower.includes('pizza') || nameLower.includes('burger') ||
        nameLower.includes('food') || nameLower.includes('kitchen')) {
      return 'Restaurant';
    }
    
    // Clothing/Fashion hints
    if (nameLower.includes('boutique') || nameLower.includes('fashion') ||
        nameLower.includes('clothing') || nameLower.includes('apparel')) {
      return 'Clothing';
    }
    
    // Fitness/Gym hints
    if (nameLower.includes('gym') || nameLower.includes('fitness') ||
        nameLower.includes('health') || nameLower.includes('wellness')) {
      return 'Fitness';
    }
  }
  
  // Default category
  return DEFAULT_CATEGORY;
}

/**
 * Builds address string from OSM tags
 */
function buildAddress(tags: Record<string, string>): string | null {
  const addressParts: string[] = [];
  
  if (tags['addr:housenumber']) {
    addressParts.push(tags['addr:housenumber']);
  }
  
  if (tags['addr:street']) {
    addressParts.push(tags['addr:street']);
  }
  
  if (tags['addr:suburb'] || tags['addr:neighbourhood']) {
    addressParts.push(tags['addr:suburb'] || tags['addr:neighbourhood']);
  }
  
  if (tags['addr:city']) {
    addressParts.push(tags['addr:city']);
  }
  
  if (tags['addr:postcode']) {
    addressParts.push(tags['addr:postcode']);
  }
  
  return addressParts.length > 0 ? addressParts.join(', ') : null;
}

