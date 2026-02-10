import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Maps category to subcategory (matches categoryToImageMapper.ts logic)
 */
function getSubcategoryForCategory(category: string, businessName?: string): string {
  const normalizedCategory = category.trim();
  
  // Use business name hints for better categorization
  if (businessName) {
    const nameLower = businessName.toLowerCase();
    
    // Telecom/Electronics hints
    if (nameLower.includes('cell') || nameLower.includes('mobile') || 
        nameLower.includes('vodacom') || nameLower.includes('mtn') || 
        nameLower.includes('telkom') || nameLower.includes('telecom') ||
        nameLower.includes('phone') || nameLower.includes('cellular')) {
      return 'electronics';
    }
    
    // Restaurant/Food hints
    if (nameLower.includes('restaurant') || nameLower.includes('cafe') || 
        nameLower.includes('bistro') || nameLower.includes('diner') ||
        nameLower.includes('pizza') || nameLower.includes('burger') ||
        nameLower.includes('food') || nameLower.includes('kitchen')) {
      return 'restaurants';
    }
    
    // Clothing/Fashion hints
    if (nameLower.includes('boutique') || nameLower.includes('fashion') ||
        nameLower.includes('clothing') || nameLower.includes('apparel')) {
      return 'fashion';
    }
    
    // Fitness/Gym hints
    if (nameLower.includes('gym') || nameLower.includes('fitness') ||
        nameLower.includes('health') || nameLower.includes('wellness')) {
      return 'gyms';
    }
  }
  
  // Category to subcategory mapping
  const categoryMap: Record<string, string> = {
    // Food & Drink
    'Restaurant': 'restaurants',
    'Fast Food': 'fast-food',
    'Coffee Shop': 'cafes',
    'Bar': 'bars',
    'Bakery': 'restaurants',
    'Ice Cream': 'fast-food',
    'Supermarket': 'fast-food',
    'Grocery': 'fast-food',
    
    // Beauty & Wellness
    'Salon': 'salons',
    'Wellness': 'wellness',
    'Fitness': 'gyms',
    'Spa': 'spas',
    
    // Professional Services
    'Bank': 'finance-insurance',
    'ATM': 'finance-insurance',
    'Insurance': 'finance-insurance',
    'Pharmacy': 'finance-insurance',
    'Dental': 'education-learning',
    'Veterinary': 'veterinarians',
    'Clinic': 'education-learning',
    'Hospital': 'education-learning',
    
    // Arts & Culture
    'Museum': 'museums',
    'Art Gallery': 'galleries',
    'Theater': 'theaters',
    'Cinema': 'theaters',
    'Music Venue': 'concerts',
    'Nightclub': 'nightlife',
    'Bookstore': 'books',
    
    // Shopping & Lifestyle
    'Clothing': 'fashion',
    'Jewelry': 'fashion',
    'Florist': 'home-decor',
    
    // Electronics & Telecom
    'Electronics': 'electronics',
    
    // Outdoors & Adventure
    'Park': 'hiking',
    'Zoo': 'family-activities',
    'Aquarium': 'family-activities',
    'Attraction': 'events-festivals',
    'Gas Station': 'transport-travel',
    'Parking': 'transport-travel',
    'Hotel': 'accommodation',
    'Hostel': 'accommodation',
    'Accommodation': 'accommodation',
    'Guest House': 'accommodation',
    'Guesthouse': 'accommodation',
    'Lodge': 'accommodation',
    'Motel': 'accommodation',
    'Airport': 'airports',
    'Train Station': 'train-stations',
    'Bus Station': 'bus-stations',
    'Car Rental': 'car-rental-businesses',
    'Campervan Rental': 'campervan-rentals',
    'Shuttle Service': 'shuttle-services',
    'Chauffeur Service': 'chauffeur-services',
    'Travel Service': 'travel-services',
    'Tour Guide': 'tour-guides',
    'Travel Agency': 'travel-agencies',
    'Luggage Shop': 'luggage-shops',
    'Travel Insurance Provider': 'travel-insurance-providers',
    
    // Default fallback
    'Business': 'electronics',
  };
  
  // Try exact match
  if (categoryMap[normalizedCategory]) {
    return categoryMap[normalizedCategory];
  }
  
  // Try case-insensitive match
  const lowerCategory = normalizedCategory.toLowerCase();
  const matchingKey = Object.keys(categoryMap).find(
    key => key.toLowerCase() === lowerCategory
  );
  
  if (matchingKey) {
    return categoryMap[matchingKey];
  }
  
  // Default fallback
  return 'electronics';
}

/**
 * Maps subcategory to PNG file (matches categoryToImageMapper.ts logic)
 */
function getPngForSubcategory(subcategory: string): string {
  const subcategoryMap: Record<string, string> = {
    // Food & Drink
    'restaurants': '001-restaurant.png',
    'cafes': '002-coffee-cup.png',
    'bars': '003-cocktail.png',
    'fast-food': '031-fast-food.png',
    'fine-dining': '004-dinner.png',
    
    // Beauty & Wellness
    'gyms': '014-dumbbell.png',
    'spas': '010-spa.png',
    'salons': '009-salon.png',
    'wellness': '013-body-massage.png',
    'nail-salons': '011-nail-polish.png',
    
    // Professional Services
    'education-learning': '044-student.png',
    'transport-travel': '045-transportation.png',
    'finance-insurance': '046-insurance.png',
    'plumbers': '047-plunger.png',
    'electricians': '049-broken-cable.png',
    'legal-services': '050-balance.png',

    // Travel
    'accommodation': '036-summer.png',
    'transport': '045-transportation.png',
    'airports': '045-transportation.png',
    'train-stations': '045-transportation.png',
    'bus-stations': '045-transportation.png',
    'car-rental-businesses': '045-transportation.png',
    'campervan-rentals': '036-summer.png',
    'shuttle-services': '045-transportation.png',
    'chauffeur-services': '045-transportation.png',
    'travel-services': '045-transportation.png',
    'tour-guides': '035-tour-guide.png',
    'travel-agencies': '045-transportation.png',
    'luggage-shops': '023-shopping-bag.png',
    'travel-insurance-providers': '046-insurance.png',
    
    // Outdoors & Adventure
    'hiking': '034-skydive.png',
    'cycling': '033-sport.png',
    'water-sports': '032-swim.png',
    'camping': '036-summer.png',
    
    // Entertainment & Experiences
    'events-festivals': '022-party-people.png',
    'sports-recreation': '033-sport.png',
    'nightlife': '041-dj.png',
    'comedy-clubs': '042-mime.png',
    
    // Arts & Culture
    'museums': '018-museum.png',
    'galleries': '019-art-gallery.png',
    'theaters': '020-theatre.png',
    'concerts': '040-stage.png',
    
    // Family & Pets
    'family-activities': '022-party-people.png',
    'pet-services': '038-pet.png',
    'childcare': '044-student.png',
    'veterinarians': '037-veterinarian.png',
    
    // Shopping & Lifestyle
    'fashion': '024-boutique.png',
    'electronics': '023-shopping-bag.png',
    'home-decor': '026-house-decoration.png',
    'books': '025-open-book.png',
  };
  
  return subcategoryMap[subcategory] || '023-shopping-bag.png';
}

/**
 * Gets the image URL for a business based on category and name
 */
function getCategoryImageUrl(category: string, businessName?: string): string {
  if (!category) {
    return '/png/023-shopping-bag.png';
  }
  
  const subcategory = getSubcategoryForCategory(category, businessName);
  const pngFile = getPngForSubcategory(subcategory);
  
  return `/png/${pngFile}`;
}

export async function POST(req: NextRequest) {
  try {
    console.log('[UPDATE-IMAGES] Starting image URL update for all businesses...');
    
    // Fetch all businesses (use primary_* taxonomy columns after 20260210)
    const { data: businesses, error: fetchError } = await supabase
      .from('businesses')
      .select('id, name, primary_subcategory_slug, primary_subcategory_label, image_url');
    
    if (fetchError) {
      console.error('[UPDATE-IMAGES] Error fetching businesses:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch businesses', details: fetchError.message },
        { status: 500 }
      );
    }
    
    if (!businesses || businesses.length === 0) {
      return NextResponse.json(
        { message: 'No businesses found', updated: 0 },
        { status: 200 }
      );
    }
    
    console.log(`[UPDATE-IMAGES] Found ${businesses.length} businesses to process`);
    
    // Update businesses in batches
    const batchSize = 100;
    let updated = 0;
    let skipped = 0;
    const errors: any[] = [];
    
    for (let i = 0; i < businesses.length; i += batchSize) {
      const batch = businesses.slice(i, i + batchSize);
      
      for (const business of batch) {
        // Only update PNG placeholders, not uploaded images or external URLs
        const shouldUpdate = 
          !business.image_url || 
          business.image_url.startsWith('/png/') ||
          (!business.image_url.startsWith('http') && !business.image_url.startsWith('/'));
        
        if (!shouldUpdate) {
          skipped++;
          continue;
        }
        
        const subcategorySlug = (business as { primary_subcategory_slug?: string }).primary_subcategory_slug
          || ((business as { primary_subcategory_label?: string }).primary_subcategory_label
            ? getSubcategoryForCategory((business as { primary_subcategory_label?: string }).primary_subcategory_label!, business.name)
            : 'electronics');
        const newImageUrl = `/png/${getPngForSubcategory(subcategorySlug)}`;
        
        // Only update if the URL has changed
        if (business.image_url !== newImageUrl) {
          const { error: updateError } = await supabase
            .from('businesses')
            .update({ image_url: newImageUrl })
            .eq('id', business.id);
          
          if (updateError) {
            console.error(`[UPDATE-IMAGES] Error updating business ${business.id}:`, updateError);
            errors.push({ id: business.id, name: business.name, error: updateError.message });
          } else {
            updated++;
          }
        } else {
          skipped++;
        }
      }
      
      console.log(`[UPDATE-IMAGES] Processed ${Math.min(i + batchSize, businesses.length)}/${businesses.length} businesses...`);
    }
    
    console.log(`[UPDATE-IMAGES] Update complete! Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors.length}`);
    
    return NextResponse.json({
      message: 'Image URLs updated successfully',
      total: businesses.length,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[UPDATE-IMAGES] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to update image URLs', details: error.message },
      { status: 500 }
    );
  }
}

