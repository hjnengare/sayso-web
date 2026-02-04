import crypto from 'crypto';
import { NextResponse } from 'next/server';

export type FeedSeedWindow = {
  seed: string;
  expiresAtMs: number;
  windowMinutes: number;
};

export function createRequestId(): string {
  // crypto.randomUUID is available in Node 20
  return crypto.randomUUID();
}

function sha1Base64Url(value: string): string {
  return crypto
    .createHash('sha1')
    .update(value)
    .digest('base64url');
}

export function createFeedSeedWindow(options: {
  userKey: string; // already hashed/sanitized (e.g. "user:<hash>" or "anon:<ipHash>")
  regionKey: string; // e.g. "loc:Cape Town" or "geo:-33.9,18.4" or "global"
  windowMinutes?: number;
  nowMs?: number;
}): FeedSeedWindow {
  const windowMinutes = Math.max(1, Math.min(60, options.windowMinutes ?? 15));
  const nowMs = options.nowMs ?? Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const windowIndex = Math.floor(nowMs / windowMs);
  const expiresAtMs = (windowIndex + 1) * windowMs;
  const seed = sha1Base64Url(`${options.userKey}|${options.regionKey}|${windowIndex}`);
  return { seed, expiresAtMs, windowMinutes };
}

export function createWeakEtagFromKey(cacheKey: string): string {
  // Weak ETag is enough for our short TTL and per-user caching.
  return `W/\"${sha1Base64Url(cacheKey).slice(0, 27)}\"`;
}

export function applyFeedCachingHeaders(
  response: NextResponse,
  options: {
    etag: string;
    ttlSeconds?: number;
    swrSeconds?: number;
    requestId?: string;
    seed?: string;
    seedExpiresAtMs?: number;
    feedPath?: string;
  }
): NextResponse {
  const ttlSeconds = Math.max(0, Math.min(300, options.ttlSeconds ?? 60));
  const swrSeconds = Math.max(0, Math.min(300, options.swrSeconds ?? 30));

  // Per-user responses must be private (cookies affect auth + RLS).
  const cacheDirectives = [`private`, `max-age=${ttlSeconds}`, `must-revalidate`];
  if (swrSeconds > 0) cacheDirectives.push(`stale-while-revalidate=${swrSeconds}`);

  response.headers.set('Cache-Control', cacheDirectives.join(', '));
  response.headers.set('ETag', options.etag);
  response.headers.set('Vary', 'Cookie, Authorization');

  if (options.requestId) response.headers.set('X-Request-Id', options.requestId);
  if (options.feedPath) response.headers.set('X-Feed-Path', options.feedPath);
  if (options.seed) response.headers.set('X-Feed-Seed', options.seed);
  if (options.seedExpiresAtMs) {
    response.headers.set('X-Feed-Seed-Expires-At', new Date(options.seedExpiresAtMs).toISOString());
  }

  return response;
}

export function maybeNotModified(
  request: Request,
  options: {
    etag: string;
    ttlSeconds?: number;
    swrSeconds?: number;
    requestId?: string;
    seed?: string;
    seedExpiresAtMs?: number;
    feedPath?: string;
  }
): NextResponse | null {
  const ifNoneMatch = request.headers.get('if-none-match');
  if (!ifNoneMatch) return null;
  if (ifNoneMatch !== options.etag) return null;

  const response = new NextResponse(null, { status: 304 });
  return applyFeedCachingHeaders(response, options);
}

