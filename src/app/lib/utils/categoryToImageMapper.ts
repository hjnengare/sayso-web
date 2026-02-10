/**
 * Maps business categories to subcategories and then to PNG placeholder images
 */

// Mapping from OSM category names to subcategory IDs
// This maps the categories from OSM_CATEGORY_MAP in overpassService.ts
const CATEGORY_TO_SUBCATEGORY: Record<string, string> = {
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
  
  // Default fallback - use a generic shopping icon instead of restaurant
  'Business': 'electronics', // Generic fallback (shopping bag icon)
};

// Mapping from subcategory IDs to PNG file names
const SUBCATEGORY_TO_PNG: Record<string, string> = {
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
  'hiking': '034-skydive.png', // Using skydive as adventure
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

/**
 * Gets the PNG placeholder image path for a business category
 * @param category - The business category (e.g., "Restaurant", "Coffee Shop")
 * @returns The path to the PNG image (e.g., "/png/001-restaurant.png")
 */
export function getCategoryImageUrl(category: string): string {
  if (!category) {
    return '/png/023-shopping-bag.png'; // Default fallback to shopping bag
  }
  
  // Normalize category name (trim and handle case variations)
  const normalizedCategory = category.trim();
  
  // Try exact match first
  let subcategory = CATEGORY_TO_SUBCATEGORY[normalizedCategory];
  
  // If no exact match, try case-insensitive lookup
  if (!subcategory) {
    const lowerCategory = normalizedCategory.toLowerCase();
    // Find matching key (case-insensitive)
    const matchingKey = Object.keys(CATEGORY_TO_SUBCATEGORY).find(
      key => key.toLowerCase() === lowerCategory
    );
    if (matchingKey) {
      subcategory = CATEGORY_TO_SUBCATEGORY[matchingKey];
    }
  }
  
  // Default fallback if no match found - use electronics (shopping bag) instead of restaurant
  if (!subcategory) {
    subcategory = 'electronics';
  }
  
  // Map subcategory to PNG
  const pngFile = SUBCATEGORY_TO_PNG[subcategory] || '023-shopping-bag.png'; // Default fallback to shopping bag
  
  return `/png/${pngFile}`;
}

/**
 * Gets the subcategory ID for a business category
 * @param category - The business category
 * @returns The subcategory ID
 */
export function getSubcategoryForCategory(category: string): string {
  const normalizedCategory = category.trim();
  return CATEGORY_TO_SUBCATEGORY[normalizedCategory] || 
         CATEGORY_TO_SUBCATEGORY[normalizedCategory.toLowerCase()] ||
         'electronics'; // Default fallback to electronics (shopping bag icon)
}

