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

  // Travel
  accommodation: 'travel',
  transport: 'travel',
  airports: 'travel',
  'train-stations': 'travel',
  'bus-stations': 'travel',
  'car-rental-businesses': 'travel',
  'campervan-rentals': 'travel',
  'shuttle-services': 'travel',
  'chauffeur-services': 'travel',
  'travel-services': 'travel',
  'tour-guides': 'travel',
  'travel-agencies': 'travel',
  'luggage-shops': 'travel',
  'travel-insurance-providers': 'travel',

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
  return SUBCATEGORY_TO_INTEREST[subcategoryId];
}
