/**
 * Next.js 16 Proxy (formerly Middleware)
 *
 * Handles authentication, email verification, and onboarding routing.
 * Uses the proxy function from src/proxy.ts for main logic.
 */

import { proxy as handleRequest } from './src/proxy';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  return handleRequest(request);
}

// Config must be a static object (can't be re-exported)
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next internals)
     * - favicon.ico, sitemap.xml, robots.txt
     * - api routes
     * - static assets (images)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
