/**
 * Factory for creating test business data
 */

export interface BusinessFactoryOptions {
  id?: string;
  name?: string;
  category?: string;
  location?: string;
  interest_id?: string;
  sub_interest_id?: string;
  price_range?: string;
  average_rating?: number;
  total_reviews?: number;
  verified?: boolean;
  distance_km?: number | null;
  percentiles?: Record<string, number> | null;
  description?: string;
  created_at?: string;
  updated_at?: string;
  latitude?: number;
  longitude?: number;
}

export function createBusiness(options: BusinessFactoryOptions = {}) {
  const id = options.id || `business-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();

  return {
    id,
    name: options.name || `Test Business ${id}`,
    category: options.category || 'Restaurant',
    location: options.location || 'Cape Town',
    interest_id: options.interest_id || 'food-drink',
    sub_interest_id: options.sub_interest_id || null,
    price_range: options.price_range || '$$',
    average_rating: options.average_rating ?? 4.5,
    total_reviews: options.total_reviews ?? 10,
    verified: options.verified ?? true,
    distance_km: options.distance_km ?? null,
    percentiles: options.percentiles || {
      punctuality: 85,
      friendliness: 90,
      'cost-effectiveness': 80,
    },
    description: options.description || `A great ${options.category || 'business'} in ${options.location || 'Cape Town'}`,
    created_at: options.created_at || timestamp,
    updated_at: options.updated_at || timestamp,
    latitude: options.latitude || -33.9249,
    longitude: options.longitude || 18.4241,
    slug: options.name?.toLowerCase().replace(/\s+/g, '-') || `test-business-${id}`,
    image_url: `https://example.com/images/${id}.jpg`,
    phone: '+27123456789',
    email: `contact@${id}.com`,
    website: `https://${id}.com`,
    hours: {
      monday: '9:00 AM - 5:00 PM',
      tuesday: '9:00 AM - 5:00 PM',
      wednesday: '9:00 AM - 5:00 PM',
      thursday: '9:00 AM - 5:00 PM',
      friday: '9:00 AM - 5:00 PM',
      saturday: '10:00 AM - 4:00 PM',
      sunday: 'Closed',
    },
  };
}

export function createBusinessArray(count: number, options: Partial<BusinessFactoryOptions> = {}) {
  return Array.from({ length: count }, (_, index) =>
    createBusiness({
      ...options,
      id: options.id || `business-${index}`,
      name: options.name || `Test Business ${index + 1}`,
      average_rating: options.average_rating ?? (4.0 + (index * 0.1)),
      total_reviews: options.total_reviews ?? (5 + index),
    })
  );
}

/**
 * Create a business with high personalization score
 */
export function createHighScoreBusiness(userPreferences: {
  interestIds?: string[];
  subcategoryIds?: string[];
}) {
  return createBusiness({
    interest_id: userPreferences.interestIds?.[0] || 'food-drink',
    sub_interest_id: userPreferences.subcategoryIds?.[0] || null,
    average_rating: 4.8,
    total_reviews: 50,
    verified: true,
    distance_km: 2.5,
    percentiles: {
      punctuality: 90,
      friendliness: 95,
      'cost-effectiveness': 85,
    },
  });
}

/**
 * Create a business that violates deal breakers
 */
export function createDealbreakerBusiness(dealbreakerId: string) {
  const business = createBusiness({
    verified: dealbreakerId === 'trustworthiness' ? false : true,
    price_range: dealbreakerId === 'expensive' ? '$$$$' : '$$',
    percentiles: {
      punctuality: dealbreakerId === 'punctuality' || dealbreakerId === 'slow-service' ? 50 : 85,
      friendliness: dealbreakerId === 'friendliness' ? 50 : 90,
      'cost-effectiveness': dealbreakerId === 'value-for-money' ? 50 : 80,
    },
  });

  return business;
}

