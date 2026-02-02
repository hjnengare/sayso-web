/**
 * Next.js Middleware
 * 
 * Handles authentication, email verification, and onboarding routing.
 * Uses the proxy function from src/proxy.ts for main logic.
 */

import { proxy, config as proxyConfig } from './src/proxy';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return proxy(request);
}

// Re-export the config from proxy.ts
export const config = proxyConfig;
