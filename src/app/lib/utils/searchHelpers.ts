/**
 * Search Helper Utilities
 * Functions for distance calculation, text highlighting, and search scoring
 */

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Highlight matching terms in text
 * Simple string replacement approach (Postgres ts_headline is preferred but this works client-side)
 * @param text Text to highlight
 * @param query Search query
 * @returns Text with <mark> tags around matches
 */
export function highlightText(text: string, query: string): string {
  if (!query || !text) return text;
  
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 2); // Only highlight terms longer than 2 chars
  
  if (queryTerms.length === 0) return text;
  
  let highlighted = text;
  const regex = new RegExp(`(${queryTerms.join('|')})`, 'gi');
  highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  
  return highlighted;
}

/**
 * Extract snippet from text with highlighted matches
 * @param text Full text
 * @param query Search query
 * @param maxLength Maximum snippet length
 * @returns Highlighted snippet
 */
export function extractSnippet(text: string, query: string, maxLength: number = 150): string {
  if (!text) return '';
  if (!query) return text.substring(0, maxLength);
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const index = textLower.indexOf(queryLower);
  
  if (index === -1) {
    return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
  }
  
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + query.length + maxLength - 30);
  
  let snippet = text.substring(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  
  return highlightText(snippet, query);
}

/**
 * Normalize a value to 0-1 range for scoring
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 1;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Calculate combo score combining distance, rating, and price
 * Formula: (distance_score * 0.4) + (rating_score * 0.4) + (price_score * 0.2)
 * Lower distance = better, higher rating = better, lower price = better
 * 
 * @param distanceKm Distance in kilometers (null if not available)
 * @param rating Average rating (0-5)
 * @param priceLevel Price level (1-4, where 1 is cheapest)
 * @param maxDistance Maximum distance for normalization (default 50km)
 * @returns Combo score (0-1, higher is better)
 */
export function calculateComboScore(
  distanceKm: number | null,
  rating: number | null,
  priceLevel: number | null,
  maxDistance: number = 50
): number {
  // Distance score: closer is better (inverted)
  const distanceScore = distanceKm !== null
    ? 1 - normalize(distanceKm, 0, maxDistance)
    : 0.5; // Neutral if no distance
  
  // Rating score: higher is better
  const ratingScore = rating !== null && rating > 0
    ? normalize(rating, 0, 5)
    : 0.3; // Lower score if no rating
  
  // Price score: cheaper is better (inverted)
  const priceScore = priceLevel !== null
    ? 1 - normalize(priceLevel, 1, 4)
    : 0.5; // Neutral if no price
  
  // Weighted combination
  return (distanceScore * 0.4) + (ratingScore * 0.4) + (priceScore * 0.2);
}

/**
 * Convert price_range string to numeric level
 * '$' = 1, '$$' = 2, '$$$' = 3, '$$$$' = 4
 */
export function priceRangeToLevel(priceRange: string | null | undefined): number | null {
  if (!priceRange) return null;
  return priceRange.length; // '$' = 1, '$$' = 2, etc.
}

/**
 * Validate latitude
 */
export function isValidLatitude(lat: number | null): boolean {
  return lat !== null && !isNaN(lat) && lat >= -90 && lat <= 90;
}

/**
 * Validate longitude
 */
export function isValidLongitude(lng: number | null): boolean {
  return lng !== null && !isNaN(lng) && lng >= -180 && lng <= 180;
}

