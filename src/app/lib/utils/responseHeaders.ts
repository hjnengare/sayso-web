/**
 * Utility function to add no-cache headers to responses
 * Ensures fresh data in development and prevents unwanted caching
 */
import { NextResponse } from 'next/server';

/**
 * Adds no-cache headers to a NextResponse
 * Use this for all dynamic API routes that must return fresh data
 */
export function addNoCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Surrogate-Control', 'no-store');
  return response;
}

/**
 * Creates a NextResponse with no-cache headers
 */
export function noCacheResponse(data: any, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(data, init);
  return addNoCacheHeaders(response);
}

