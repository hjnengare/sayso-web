/**
 * URL parameter helpers for onboarding flow
 * Handles encoding/decoding selections for URL params with validation and deduplication
 */

const MAX_URL_LENGTH = 2000; // Safe URL length limit
const MAX_PARAM_LENGTH = 500; // Max length for individual param

/**
 * Encode array of selections to URL-safe comma-separated string
 */
export function encodeSelections(selections: string[]): string {
  if (!Array.isArray(selections) || selections.length === 0) {
    return '';
  }

  // Clean, trim, dedupe
  // Note: URLSearchParams will handle URL encoding automatically
  const cleaned = Array.from(new Set(
    selections
      .filter(s => s && typeof s === 'string')
      .map(s => s.trim())
      .filter(s => s.length > 0)
  ));

  if (cleaned.length === 0) {
    return '';
  }

  return cleaned.join(',');
}

/**
 * Decode comma-separated string to array of selections
 */
export function decodeSelections(param: string | null | undefined): string[] {
  if (!param || typeof param !== 'string') {
    return [];
  }

  // Split, trim, filter empty, dedupe
  // Note: URLSearchParams.get() already handles URL decoding automatically
  const decoded = Array.from(new Set(
    param
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
  ));

  return decoded;
}

/**
 * Build URL with multiple selection params
 */
export function buildOnboardingUrl(
  basePath: string,
  params: {
    interests?: string[];
    subcategories?: string[];
    dealbreakers?: string[];
  }
): string {
  const url = new URL(basePath, 'http://localhost'); // Base URL for parsing
  const searchParams = new URLSearchParams();

  if (params.interests && params.interests.length > 0) {
    const encoded = encodeSelections(params.interests);
    if (encoded) {
      searchParams.set('interests', encoded);
    }
  }

  if (params.subcategories && params.subcategories.length > 0) {
    const encoded = encodeSelections(params.subcategories);
    if (encoded) {
      searchParams.set('subcategories', encoded);
    }
  }

  if (params.dealbreakers && params.dealbreakers.length > 0) {
    const encoded = encodeSelections(params.dealbreakers);
    if (encoded) {
      searchParams.set('dealbreakers', encoded);
    }
  }

  const queryString = searchParams.toString();
  const fullUrl = queryString ? `${basePath}?${queryString}` : basePath;

  // Debug logging
  console.log('[buildOnboardingUrl] Built URL:', {
    basePath,
    params,
    queryString,
    fullUrl,
    length: fullUrl.length
  });

  // Check if URL is too long - use sessionStorage as fallback
  if (fullUrl.length > MAX_URL_LENGTH) {
    console.warn('[URL Params] URL too long, using sessionStorage fallback');
    const storageKey = `onboarding_${Date.now()}`;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(storageKey, JSON.stringify(params));
      return `${basePath}?storage=${storageKey}`;
    }
  }

  return fullUrl;
}

/**
 * Parse onboarding params from URL or sessionStorage
 */
export function parseOnboardingParams(searchParams: URLSearchParams): {
  interests: string[];
  subcategories: string[];
  dealbreakers: string[];
} {
  // Check for sessionStorage fallback
  const storageKey = searchParams.get('storage');
  if (storageKey && typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          interests: parsed.interests || [],
          subcategories: parsed.subcategories || [],
          dealbreakers: parsed.dealbreakers || [],
        };
      }
    } catch (error) {
      console.error('[URL Params] Error reading from sessionStorage:', error);
    }
  }

  return {
    interests: decodeSelections(searchParams.get('interests')),
    subcategories: decodeSelections(searchParams.get('subcategories')),
    dealbreakers: decodeSelections(searchParams.get('dealbreakers')),
  };
}

/**
 * Validate that required params are present
 */
export function validateOnboardingParams(
  params: {
    interests: string[];
    subcategories: string[];
    dealbreakers: string[];
  },
  required: ('interests' | 'subcategories' | 'dealbreakers')[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (required.includes('interests') && (!params.interests || params.interests.length === 0)) {
    missing.push('interests');
  }

  if (required.includes('subcategories') && (!params.subcategories || params.subcategories.length === 0)) {
    missing.push('subcategories');
  }

  if (required.includes('dealbreakers') && (!params.dealbreakers || params.dealbreakers.length === 0)) {
    missing.push('dealbreakers');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

