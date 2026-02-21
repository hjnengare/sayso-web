# Middleware iOS Tab Crash – Diagnosis & Fix

## What Caused the iOS Crash

The "Can't open this page" tab crash on iOS Safari/Chrome was most likely caused by:

1. **Redirect loop**  
   Middleware could redirect unauthenticated users from a protected route (e.g. `/home`) to `/login`, while the client (or a slow/partial session on iOS) could send the user back to a protected route. That produced repeated 307/308 redirects (e.g. `/home` → `/login` → `/home` → …). After several redirects, iOS kills the tab.

2. **Onboarding logic running without a session**  
   If `getUser()` failed or was slow on mobile (e.g. cookie/edge issues), `user` could be null while the rest of the middleware still ran. Any logic that might redirect to onboarding/complete when `user` is null increases the risk of confusing or repeated redirects.

3. **No loop guard**  
   There was no check to stop after N redirects in a short time, so a loop could continue until the tab crashed.

## How the Fix Prevents It

1. **Redirect loop guard**  
   A short-lived cookie (`_sg`, 5s) counts redirects. If we redirect 2+ times within 5 seconds, we stop redirecting and `NextResponse.next()` so the request is allowed through. That breaks the loop and avoids the crash.

2. **Early exit when there is no user**  
   As soon as we know there is **no** authenticated user:
   - We **never** run onboarding RPC or any onboarding/complete redirect logic.
   - We only: allow public routes, or redirect protected routes to `/login` (or `/verify-email` when referer suggests it). Then we return. So unauthenticated users never hit onboarding-related redirects.

3. **Onboarding only after a confirmed session**  
   Onboarding status (RPC) and all onboarding/complete redirects run only when `user` exists and (where relevant) `user.email_confirmed_at` is set. No redirect to `/interests` or `/complete` when there is no user.

4. **Never redirect away from /verify-email or /login**  
   `/login` and `/verify-email` are in `PUBLIC_AUTH_ROUTES`; we return `NextResponse.next()` at the top for them. So we never redirect **from** these pages based on onboarding flags.

5. **Instrumentation**  
   `edgeLog()` logs pathname, `hasUser`, `emailConfirmed`, `isBusiness`, `onboardingComplete`, and redirect target to the console so Vercel Edge logs show exactly what the middleware did.

---

## Reproduction Checklist

### Desktop (Chrome/Edge) – Network tab

1. Open DevTools → Network. Enable "Preserve log".
2. Visit `https://sayso-snowy.vercel.app/` (or your deploy).
3. Watch for **repeated 307/308** responses:
   - If you see a cycle (e.g. `/` → `/login` → `/home` → `/login` → …), that’s a redirect loop.
4. Try:
   - Visit `/home` while logged out → expect one redirect to `/login`.
   - Visit `/login` → no redirect; page loads.
   - Log in and visit `/home` → no redirect (or one redirect to onboarding if incomplete).
5. In the logs, look for `[Edge] REDIRECT` / `[Edge] ALLOW` to see middleware decisions.

### Mobile (iOS Safari/Chrome)

1. **Remote debugging (Safari)**  
   - Mac: Safari → Develop → [your iPhone] → pick the tab.  
   - Reproduce the crash and check Console for errors or repeated redirects.

2. **Vercel logs**  
   - Vercel Dashboard → Project → Logs (or Runtime Logs).  
   - Filter by "Edge" or "[Edge]".  
   - Reproduce on the device; in the logs you should see:
     - `pathname=... hasUser=... emailOk=...` and either `ALLOW` or `REDIRECT ... to=...`.
   - If you see the same pathname with `REDIRECT` over and over in a few seconds, that was a loop (now prevented by the guard).

3. **Steps on device**  
   - Clear site data (or use private tab).  
   - Open `https://sayso-snowy.vercel.app/`.  
   - If it used to crash: with the fix, the tab should load (possibly after one redirect to `/login` or the first page).  
   - Try opening `/home` while logged out: one redirect to `/login`, then stable.

---

## Safety / Correctness

- **No `fetch('/api/...')` in middleware** – only Supabase client and cookies.
- **No `localStorage` / `window`** – middleware runs in the Edge runtime.
- **Matcher** – excludes `_next/static`, `_next/image`, `favicon.ico`, `api`, and common image extensions; no internal Next.js paths in the matcher.
- **Business owner flow** – redirect to `/my-businesses` only when `user` exists and `user.email_confirmed_at` is set (and account is business).
- **/complete** – only allowed when onboarding is complete; otherwise we redirect to `/onboarding` (which leads to `/interests` as the first step).

---

## Middleware File

The middleware lives in **`src/proxy.ts`** (Next.js 13+ “proxy” convention). All redirects go through `redirectWithGuard(request, url)` so the loop guard cookie is set and the loop detector can trigger. Key helpers:

- `checkRedirectLoop(request)` – true if we’ve already redirected 2+ times in the last 5 seconds.
- `redirectWithGuard(req, url)` – redirect and set `_sg` cookie.
- `edgeLog(decision, pathname, meta)` – one-line log for Vercel Edge.

For the full code, see `src/proxy.ts`.
