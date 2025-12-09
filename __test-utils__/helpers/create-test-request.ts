/**
 * Helper to create NextRequest-compatible requests for testing
 * 
 * IMPORTANT: NextRequest internally creates a Request object.
 * If we polyfill Request, it conflicts with NextRequest's getter-only properties.
 * 
 * Solution: Use string URLs directly - NextRequest can handle strings natively
 * without needing a Request polyfill.
 */

import { NextRequest } from 'next/server';

/**
 * Create a NextRequest for testing API routes
 * 
 * Uses string URLs directly - NextRequest's constructor accepts strings
 * and handles URL parsing internally without requiring a Request polyfill.
 * 
 * This avoids the "Cannot set property url" error that occurs when
 * NextRequest tries to extend a polyfilled Request with setters.
 */
export function createTestRequest(
  url: string,
  init?: {
    method?: string;
    body?: string | FormData;
    headers?: Record<string, string>;
  }
): NextRequest {
  // Use string directly - NextRequest handles URL parsing internally
  // This avoids Request polyfill conflicts
  if (init) {
    return new NextRequest(url, init);
  }
  
  return new NextRequest(url);
}

