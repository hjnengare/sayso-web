/**
 * Validation utilities for user profile data and reviews
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Review Validator Class
 */
export class ReviewValidator {
  private static readonly MIN_CONTENT_LENGTH = 10;
  private static readonly MAX_CONTENT_LENGTH = 5000;
  private static readonly MAX_TITLE_LENGTH = 200;
  private static readonly MIN_RATING = 1;
  private static readonly MAX_RATING = 5;

  static validateReviewData(data: {
    content: string;
    title?: string;
    rating: number;
    tags?: string[];
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate content
    if (!data.content || typeof data.content !== 'string') {
      errors.push('Review content is required');
    } else {
      const contentLength = data.content.trim().length;
      if (contentLength < this.MIN_CONTENT_LENGTH) {
        errors.push(`Review content must be at least ${this.MIN_CONTENT_LENGTH} characters`);
      }
      if (contentLength > this.MAX_CONTENT_LENGTH) {
        errors.push(`Review content must not exceed ${this.MAX_CONTENT_LENGTH} characters`);
      }
    }

    // Validate title (optional)
    if (data.title && data.title.length > this.MAX_TITLE_LENGTH) {
      errors.push(`Review title must not exceed ${this.MAX_TITLE_LENGTH} characters`);
    }

    // Validate rating
    if (typeof data.rating !== 'number' || isNaN(data.rating)) {
      errors.push('Rating must be a number');
    } else {
      if (data.rating < this.MIN_RATING || data.rating > this.MAX_RATING) {
        errors.push(`Rating must be between ${this.MIN_RATING} and ${this.MAX_RATING}`);
      }
    }

    // Validate tags (optional)
    if (data.tags && !Array.isArray(data.tags)) {
      errors.push('Tags must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Validate website URL format
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate bio length
 */
export function isValidBio(bio: string | undefined): boolean {
  if (!bio) return true; // Empty is valid
  return bio.length <= 2000;
}

/**
 * Validate social links object
 */
export function isValidSocialLinks(
  links: Record<string, string> | undefined
): boolean {
  if (!links) return true;
  return Object.values(links).every((url) => !url || isValidUrl(url));
}

/**
 * Sanitize and validate profile update payload
 */
export function validateProfileUpdate(payload: {
  bio?: string;
  location?: string;
  website_url?: string;
  social_links?: Record<string, string>;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (payload.bio !== undefined && !isValidBio(payload.bio)) {
    errors.push('Bio must be 2000 characters or less');
  }

  if (payload.website_url !== undefined && payload.website_url) {
    if (!isValidUrl(payload.website_url)) {
      errors.push('Website URL must be a valid HTTP/HTTPS URL');
    }
  }

  if (payload.social_links !== undefined) {
    if (!isValidSocialLinks(payload.social_links)) {
      errors.push('All social links must be valid URLs');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a string is a valid UUID
 * @param value - The string to validate
 * @returns true if the string is a valid UUID, false otherwise
 */
export function isValidUUID(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  // UUID v4 regex pattern (8-4-4-4-12 format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  return uuidRegex.test(value);
}

/**
 * Check if a string is an optimistic ID (temporary client-side ID)
 * @param value - The string to check
 * @returns true if the string is an optimistic ID, false otherwise
 */
export function isOptimisticId(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  return value.startsWith('optimistic-') || value.startsWith('temp-');
}
