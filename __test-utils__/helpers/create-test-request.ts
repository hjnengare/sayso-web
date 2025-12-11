/**
 * Helper to create NextRequest-compatible requests for testing
 * 
 * IMPORTANT: This helper never touches request.url - it only manipulates
 * the URL instance BEFORE creating the NextRequest. This avoids conflicts
 * with NextRequest's getter-only properties.
 * 
 * For API route tests, ensure testEnvironment: 'node' is set in Jest config
 * (see jest.api.config.js) to use Node's native Request/Response.
 */

import { NextRequest } from 'next/server';

type CreateTestRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  query?: Record<string, string | number | boolean | null | undefined>;
};

/**
 * Create a NextRequest for testing API routes
 * 
 * Builds the URL with query parameters before creating the NextRequest,
 * avoiding any mutation of the request.url property after creation.
 */
export function createTestRequest(
  path: string,
  options: CreateTestRequestOptions = {}
): NextRequest {
  const { method = 'GET', headers, body, query } = options;

  // Build URL with search params BEFORE creating NextRequest
  const url = new URL(`http://localhost:3000${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  // Let NextRequest wrap Node's native Request
  // Never mutate request.url after this point
  return new NextRequest(url, {
    method,
    headers,
    body,
  } as RequestInit);
}

