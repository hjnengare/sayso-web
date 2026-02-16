# Production Readiness Improvements

Recommendations to harden Sayso for production, based on a review of the codebase.

---

## 1. Security

### 1.1 Secrets & environment

- **`.env` in version control**  
  Ensure `.env` and `.env.local` are in `.gitignore` and never committed. Use `.env.example` (no real secrets) for required keys. Rotate any keys that may have been committed.

- **No `NEXT_PUBLIC_` for secrets**  
  Auth rate-limit uses `NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS` and `NEXT_PUBLIC_LOCKOUT_DURATION_MINUTES`. These are exposed to the client. Prefer server-only env vars (e.g. `MAX_LOGIN_ATTEMPTS`) and read them in API routes only.

- **Disable test/debug in production**  
  Guard or remove in production:
  - `/test-auth`, `/test-supabase`, `/test/onboarding-performance`
  - `/api/test/*`, `/api/debug/*`  
  Use `NODE_ENV === 'production'` or a feature flag and return 404 for these routes in prod.

### 1.2 API protection

- **Rate limiting**  
  Auth has rate limiting; most other APIs do not. Add:
  - Global or per-route rate limits (e.g. Vercel, Upstash, or middleware) for public and mutating endpoints (reviews, businesses, claims, notifications).
  - Stricter limits for auth, OTP, and password reset.

- **Input validation**  
  Use a single schema layer (e.g. Zod) for API request bodies/query and reject invalid input with 400 before touching the DB. Apply consistently to:
  - `/api/businesses`, `/api/reviews`, `/api/notifications`, `/api/user/*`, claim and verification routes.

- **CORS**  
  Explicitly allow only your front-end origin(s) in production; avoid wildcard for credentials.

### 1.3 Security headers

- **Global security headers**  
  You set `X-Content-Type-Options` and `X-Frame-Options` in some places. Add them (and others) in `next.config.ts` so they apply to all responses:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (or `SAMEORIGIN` if you need iframes)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - Optional: `Content-Security-Policy` (start with report-only, then tighten).

---

## 2. Reliability & observability

### 2.1 Error handling

- **Structured logging**  
  Replace ad-hoc `console.log` / `console.error` with a small logger that:
  - In production: logs JSON (level, message, requestId, error code, no PII).
  - In development: keeps readable logs.
  - Sends errors to a service (e.g. Sentry, LogRocket) in production.

- **App-level error UI**  
  Add `app/error.tsx` (route segment errors) and `app/global-error.tsx` (root fallback) so users see a friendly message and optional recovery (e.g. “Try again”, “Go home”) instead of a blank or dev stack trace.

- **API error shape**  
  Standardise API error responses (e.g. `{ error: string, code?: string, requestId?: string }`) and avoid leaking stack traces or internal details in production.

### 2.2 Health & readiness

- **Liveness/readiness**  
  Add:
  - `GET /api/health` or `GET /api/health/live`: returns 200 if the process is up.
  - `GET /api/health/ready`: returns 200 only if dependencies (e.g. Supabase, DB) are reachable; use for load balancer or orchestrator probes.

- **Cron protection**  
  Ensure cron routes (e.g. ingest, cleanup) validate `CRON_SECRET` or equivalent and return 401 when missing or wrong.

---

## 3. Performance

### 3.1 Already in place

- Next.js image optimization, cache headers, `optimizePackageImports`, React Strict Mode.
- Feed/business caching helpers and request IDs in places.
- RLS and Supabase for data access control.

### 3.2 Further improvements

- **Database**  
  - Review slow queries (Supabase dashboard or logs); add indexes for hot paths (e.g. businesses by location/category, reviews by business, notifications by user).
  - Use connection pooling (e.g. Supabase pooler) if you see connection pressure.

- **Caching**  
  - Consider short-lived caching (e.g. Redis or Vercel KV) for hot read APIs (trending, featured, leaderboard) with invalidation on writes.
  - Keep cache TTLs and invalidation simple to avoid stale data.

- **Bundle**  
  - Run `ANALYZE=true` builds periodically; trim large dependencies or lazy-load below-the-fold or route-specific code.

---

## 4. Testing & quality

### 4.1 E2E

- Business account smoke test is in place and uses `.env` credentials.
- Add a small set of critical-path E2E tests (e.g. login → add business → see on my-businesses; submit review; claim flow) and run them in CI before deploy.

### 4.2 CI

- Add a GitHub Actions (or similar) workflow that:
  - Installs deps, runs lint and typecheck.
  - Runs unit tests if present.
  - Runs E2E tests against a preview or staging environment (with env vars in secrets).
  - Blocks merge/deploy on failure.

### 4.3 Monitoring

- **Front-end**  
  You have Web Vitals; consider reporting them to a service (e.g. Vercel Analytics, custom endpoint) to track LCP, FID, CLS in production.

- **Back-end**  
  Log and alert on:
  - 5xx and 429 rates.
  - Latency p95/p99 for key APIs.
  - Failed auth, OTP, or payment-related operations.

---

## 5. Configuration & deployment

### 5.1 Environment

- **Build-time checks**  
  In `next.config.ts` or a small build script, assert that required env vars are set for production (e.g. `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `PHONE_OTP_MODE`). Fail the build if any are missing.

- **Single source of truth**  
  Document all env vars in `.env.example` with comments (e.g. “Required in production”, “Optional, default: X”). Do not commit real values.

### 5.2 Feature flags

- For risky or gradual rollouts (e.g. new onboarding, new APIs), use a simple feature-flag layer (env vars or a small config service) so you can disable without redeploying.

---

## 6. Quick wins (high impact, low effort)

| Area        | Action |
|------------|--------|
| Security   | Add global security headers in `next.config.ts`. |
| Security   | Return 404 for `/api/test/*` and `/api/debug/*` (and test pages) when `NODE_ENV === 'production'`. |
| Reliability | Add `app/error.tsx` and `app/global-error.tsx`. |
| Reliability | Add `GET /api/health` (and optionally `/api/health/ready`). |
| Config     | Add build-time check for required production env vars. |
| Secrets    | Move auth rate-limit config to server-only env vars (no `NEXT_PUBLIC_`). |

---

## 7. Summary

- **Security:** Protect secrets, lock down test/debug, add global headers, validate input, rate-limit APIs.
- **Reliability:** Structured logging, error boundaries, health endpoints, standardised API errors.
- **Performance:** DB indexes, optional caching for hot reads, bundle analysis.
- **Quality:** CI with lint/typecheck/E2E, basic monitoring for front-end and back-end.

Prioritise the “Quick wins” and then add health checks, error boundaries, and CI; follow with rate limiting, validation, and observability.
