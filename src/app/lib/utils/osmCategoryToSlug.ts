/**
 * Maps OSM/category label (e.g. "Restaurant", "Bank") to our canonical subcategory slug.
 * Used by seed and update-images for primary_subcategory_slug.
 */
export function getSubcategorySlugForOsmCategory(
  category: string,
  businessName?: string
): string {
  const normalizedCategory = category.trim();

  if (businessName) {
    const nameLower = businessName.toLowerCase();
    if (
      nameLower.includes('cell') ||
      nameLower.includes('mobile') ||
      nameLower.includes('vodacom') ||
      nameLower.includes('mtn') ||
      nameLower.includes('telkom') ||
      nameLower.includes('telecom') ||
      nameLower.includes('phone') ||
      nameLower.includes('cellular')
    ) {
      return 'electronics';
    }
    if (
      nameLower.includes('restaurant') ||
      nameLower.includes('cafe') ||
      nameLower.includes('bistro') ||
      nameLower.includes('diner') ||
      nameLower.includes('pizza') ||
      nameLower.includes('burger') ||
      nameLower.includes('food') ||
      nameLower.includes('kitchen')
    ) {
      return 'restaurants';
    }
    if (
      nameLower.includes('boutique') ||
      nameLower.includes('fashion') ||
      nameLower.includes('clothing') ||
      nameLower.includes('apparel')
    ) {
      return 'fashion';
    }
    if (
      nameLower.includes('gym') ||
      nameLower.includes('fitness') ||
      nameLower.includes('health') ||
      nameLower.includes('wellness')
    ) {
      return 'gyms';
    }
    if (
      nameLower.includes('airport')
    ) {
      return 'airports';
    }
    if (
      nameLower.includes('train station') ||
      nameLower.includes('railway station')
    ) {
      return 'train-stations';
    }
    if (
      nameLower.includes('bus station') ||
      nameLower.includes('bus terminal')
    ) {
      return 'bus-stations';
    }
    if (
      nameLower.includes('car rental') ||
      nameLower.includes('car hire')
    ) {
      return 'car-rental-businesses';
    }
    if (
      nameLower.includes('campervan')
    ) {
      return 'campervan-rentals';
    }
    if (
      nameLower.includes('travel agency')
    ) {
      return 'travel-agencies';
    }
    if (
      nameLower.includes('tour guide')
    ) {
      return 'tour-guides';
    }
    if (
      nameLower.includes('travel insurance')
    ) {
      return 'travel-insurance-providers';
    }
    if (
      nameLower.includes('hotel') ||
      nameLower.includes('hostel') ||
      nameLower.includes('guest house') ||
      nameLower.includes('guesthouse') ||
      nameLower.includes('lodge') ||
      nameLower.includes('motel')
    ) {
      return 'accommodation';
    }
  }

  const categoryMap: Record<string, string> = {
    Restaurant: 'restaurants',
    'Fast Food': 'fast-food',
    'Coffee Shop': 'cafes',
    Bar: 'bars',
    Bakery: 'restaurants',
    'Ice Cream': 'fast-food',
    Supermarket: 'fast-food',
    Grocery: 'fast-food',
    Salon: 'salons',
    Wellness: 'wellness',
    Fitness: 'gyms',
    Spa: 'spas',
    Bank: 'finance-insurance',
    ATM: 'finance-insurance',
    Insurance: 'finance-insurance',
    Pharmacy: 'finance-insurance',
    Dental: 'education-learning',
    Veterinary: 'veterinarians',
    Clinic: 'education-learning',
    Hospital: 'education-learning',
    Museum: 'museums',
    'Art Gallery': 'galleries',
    Theater: 'theaters',
    Cinema: 'theaters',
    'Music Venue': 'concerts',
    Nightclub: 'nightlife',
    Bookstore: 'books',
    Clothing: 'fashion',
    Jewelry: 'fashion',
    Florist: 'home-decor',
    Electronics: 'electronics',
    Park: 'hiking',
    Zoo: 'family-activities',
    Aquarium: 'family-activities',
    Attraction: 'events-festivals',
    'Gas Station': 'transport-travel',
    Parking: 'transport-travel',
    Hotel: 'accommodation',
    Hostel: 'accommodation',
    Accommodation: 'accommodation',
    'Guest House': 'accommodation',
    Guesthouse: 'accommodation',
    Lodge: 'accommodation',
    Motel: 'accommodation',
    Airport: 'airports',
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
    Business: 'electronics',
  };

  if (categoryMap[normalizedCategory]) {
    return categoryMap[normalizedCategory];
  }
  const lowerCategory = normalizedCategory.toLowerCase();
  const matchingKey = Object.keys(categoryMap).find(
    (key) => key.toLowerCase() === lowerCategory
  );
  if (matchingKey) {
    return categoryMap[matchingKey];
  }
  return 'electronics';
}
