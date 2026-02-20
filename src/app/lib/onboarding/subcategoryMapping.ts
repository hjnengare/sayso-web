export const SUBCATEGORY_TO_INTEREST: Record<string, string> = {
  // Food & Drink
  restaurants: 'food-drink',
  cafes: 'food-drink',
  bars: 'food-drink',
  'fast-food': 'food-drink',
  'fine-dining': 'food-drink',

  // Beauty & Wellness
  gyms: 'beauty-wellness',
  spas: 'beauty-wellness',
  salons: 'beauty-wellness',
  wellness: 'beauty-wellness',
  'nail-salons': 'beauty-wellness',

  // Professional Services
  'education-learning': 'professional-services',
  'transport-travel': 'professional-services',
  'finance-insurance': 'professional-services',
  plumbers: 'professional-services',
  electricians: 'professional-services',
  'legal-services': 'professional-services',

  // Travel (canonical)
  accommodation: 'travel',
  transport: 'travel',
  'travel-services': 'travel',

  // Outdoors & Adventure
  hiking: 'outdoors-adventure',
  cycling: 'outdoors-adventure',
  'water-sports': 'outdoors-adventure',
  camping: 'outdoors-adventure',

  // Entertainment & Experiences
  'events-festivals': 'experiences-entertainment',
  'sports-recreation': 'experiences-entertainment',
  nightlife: 'experiences-entertainment',
  'comedy-clubs': 'experiences-entertainment',
  cinemas: 'experiences-entertainment',

  // Arts & Culture
  museums: 'arts-culture',
  galleries: 'arts-culture',
  theaters: 'arts-culture',
  concerts: 'arts-culture',

  // Family & Pets
  'family-activities': 'family-pets',
  'pet-services': 'family-pets',
  childcare: 'family-pets',
  veterinarians: 'family-pets',

  // Shopping & Lifestyle
  fashion: 'shopping-lifestyle',
  electronics: 'shopping-lifestyle',
  'home-decor': 'shopping-lifestyle',
  books: 'shopping-lifestyle',
};

export function getInterestIdForSubcategory(subcategoryId: string): string | undefined {
  const slug = subcategoryId?.trim().toLowerCase();
  if (!slug) return undefined;
  // Legacy travel slugs are mapped to the nearest canonical subcategory for backward compatibility.
  const normalized = LEGACY_TRAVEL_SUBCATEGORY_MAP[slug] ?? slug;
  return SUBCATEGORY_TO_INTEREST[normalized];
}

// Maps legacy Travel subcategory slugs to the new canonical set (Accommodation, Transport, Travel Services).
// Keep this list tight and Travel-only to avoid touching other taxonomies.
export const LEGACY_TRAVEL_SUBCATEGORY_MAP: Record<string, 'accommodation' | 'transport' | 'travel-services'> = {
  airports: 'transport',
  'train-stations': 'transport',
  'bus-stations': 'transport',
  'car-rental-businesses': 'transport',
  'campervan-rentals': 'transport',
  'shuttle-services': 'transport',
  'chauffeur-services': 'transport',
  'tour-guides': 'travel-services',
  'travel-agencies': 'travel-services',
  'luggage-shops': 'travel-services',
  'travel-insurance-providers': 'travel-services',
};
