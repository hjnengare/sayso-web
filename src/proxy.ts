import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * SIMPLIFIED ONBOARDING GUARD
 *
 * Single source of truth: profiles.onboarding_completed_at (timestamp)
 *
 * Rules:
 * 1. NO user session → do NOT redirect to onboarding/complete; only redirect protected routes to /login.
 * 2. Onboarding redirects ONLY after confirming user exists and email confirmed.
 * 3. Never redirect FROM /verify-email or /login based on onboarding flags.
 * 4. Business account → redirect to /my-businesses ONLY after email verification.
 * 5. /complete only when onboarding complete; otherwise route to /interests.
 *
 * iOS CRASH FIX: Redirect loop guard + never apply onboarding logic when !user.
 */

const DEBUG_MIDDLEWARE = process.env.NODE_ENV === 'development' || process.env.DEBUG_MIDDLEWARE === 'true';
const REDIRECT_GUARD_MAX_AGE_SEC = 5;
const REDIRECT_GUARD_COOKIE = '_sg';

interface RedirectGuardState {
  t: number;
  n: number;
  from?: string;
  to?: string;
}

function debugLog(context: string, data: Record<string, unknown>) {
  if (DEBUG_MIDDLEWARE) {
    console.log(`[Middleware:${context}]`, JSON.stringify(data, null, 2));
  }
}

/** Minimal always-on log for Vercel edge (one line). */
function edgeLog(decision: string, pathname: string, meta: { hasUser?: boolean; emailConfirmed?: boolean; isBusiness?: boolean; onboardingComplete?: boolean | null; to?: string; reason?: string }) {
  const onboardingState =
    meta.onboardingComplete === null || meta.onboardingComplete === undefined
      ? 'unknown'
      : String(meta.onboardingComplete);
  console.log(`[Edge] ${decision} pathname=${pathname} hasUser=${!!meta.hasUser} emailOk=${!!meta.emailConfirmed} business=${!!meta.isBusiness} onboardingOk=${onboardingState}${meta.to ? ` to=${meta.to}` : ''}${meta.reason ? ` reason=${meta.reason}` : ''}`);
}

function parseRedirectGuard(request: NextRequest): RedirectGuardState | null {
  const raw = request.cookies.get(REDIRECT_GUARD_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as RedirectGuardState;
  } catch {
    return null;
  }
}

function isPrefetchRequest(request: NextRequest): boolean {
  return (
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('x-middleware-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch'
  );
}

/** Redirect loop guard: if we already redirected 2+ times within REDIRECT_GUARD_MAX_AGE_SEC, allow next() to break loop. */
function shouldBypassRedirectForLoop(request: NextRequest): boolean {
  const state = parseRedirectGuard(request);
  if (!state) return false;
  const ageSec = (Date.now() - state.t) / 1000;
  return ageSec <= REDIRECT_GUARD_MAX_AGE_SEC && state.n >= 2;
}

function setRedirectGuard(req: NextRequest, response: NextResponse, target: URL): NextResponse {
  const current = parseRedirectGuard(req);
  let n = 1;
  if (current) {
    const ageSec = (Date.now() - current.t) / 1000;
    if (ageSec <= REDIRECT_GUARD_MAX_AGE_SEC) n = current.n + 1;
  }
  response.cookies.set(REDIRECT_GUARD_COOKIE, encodeURIComponent(JSON.stringify({
    t: Date.now(),
    n,
    from: req.nextUrl.pathname,
    to: target.pathname,
  } satisfies RedirectGuardState)), {
    path: '/',
    maxAge: REDIRECT_GUARD_MAX_AGE_SEC,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

function clearRedirectGuard(response: NextResponse): NextResponse {
  response.cookies.set(REDIRECT_GUARD_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}

/** Redirect with loop-guard cookie set (so we can detect 2+ redirects in 5s). */
function redirectWithGuard(req: NextRequest, url: URL): NextResponse {
  if (isPrefetchRequest(req)) {
    return NextResponse.redirect(url);
  }

  if (shouldBypassRedirectForLoop(req)) {
    console.warn('[Middleware] Redirect loop guard triggered, allowing request through', {
      pathname: req.nextUrl.pathname,
      to: url.pathname,
    });
    const allowResponse = NextResponse.next({ request: { headers: req.headers } });
    return clearRedirectGuard(allowResponse);
  }

  const res = NextResponse.redirect(url);
  return setRedirectGuard(req, res, url);
}

function isSchemaCacheError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('schema cache') && message.includes('onboarding_completed_at');
}

type NormalizedRole = 'admin' | 'business_owner' | 'user';

function normalizeRole(value: string | null | undefined): NormalizedRole | null {
  const role = String(value || '').toLowerCase().trim();
  if (!role) return null;
  if (role === 'admin' || role === 'super_admin' || role === 'superadmin') return 'admin';
  if (role === 'business_owner' || role === 'business' || role === 'owner') return 'business_owner';
  if (role === 'user' || role === 'personal') return 'user';
  return null;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestId = Math.random().toString(36).substring(7); // For tracing requests

  const PUBLIC_AUTH_ROUTES = [
    '/login',
    '/register',
    '/verify-email',
    '/business/login',
    '/business/register',
    '/auth/callback',
  ];

  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some(route =>
    pathname.startsWith(route)
  );

  if (isPublicAuthRoute) {
    return NextResponse.next();
  }

  debugLog('START', {
    requestId,
    pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent')?.substring(0, 50),
  });

  // CRITICAL: Disable caching for middleware to prevent stale profile data
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Add cache control headers to prevent caching of middleware responses
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Define public routes that should always be accessible (no auth required)
  // Include both /path and /path/ so "/business" and "/business/slug" both match
  const publicRoutes = [
    '/home',
    '/search',
    '/events',
    '/events/',
    '/business',
    '/business/',
    '/event',
    '/event/',
    '/special',
    '/special/',
    '/category',
    '/category/',
    '/categories',
    '/categories/',
    '/explore',
    '/explore/',
    '/trending',
    '/leaderboard',
    '/reviewer',
    '/reviewer/',
    '/profile/',
    '/for-you',
    '/notifications',
    '/write-review',
    '/write-review/',
    '/events-specials',
    '/sitemap.xml',
    '/robots.txt',
  ];
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route) ||
    request.nextUrl.pathname === route
  );

  let user = null;
  let authError = null;

  try {
    // Attempt to get user with timeout protection
    const getUserPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Auth check timeout')), 5000)
    );

    const { data: { user: authUser }, error } = await Promise.race([
      getUserPromise,
      timeoutPromise
    ]) as { data: { user: any }, error: any };

    debugLog('AUTH', {
      requestId,
      hasUser: !!authUser,
      userId: authUser?.id,
      emailConfirmed: !!authUser?.email_confirmed_at,
      error: error?.message,
    });

    // Handle authentication errors with better categorization
    if (error) {
      authError = error;
      const errorMessage = error.message?.toLowerCase() || '';
      const errorCode = error.code?.toLowerCase() || '';

      // Categorize errors
      const isFatalError = (
        errorMessage.includes('user from sub claim') ||
        errorMessage.includes('jwt does not exist') ||
        errorMessage.includes('user does not exist') ||
        errorCode === 'user_not_found'
      );

      const isRefreshError = (
        errorMessage.includes('refresh token') ||
        errorMessage.includes('invalid refresh token') ||
        errorCode === 'refresh_token_not_found'
      );

      const isNetworkError = (
        errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorCode === 'network_error'
      );

      // For fatal errors on protected routes, clear session and redirect
      if (isFatalError) {
        console.warn('Middleware: Fatal auth error, clearing session:', error.message);
        try {
          response.cookies.delete('sb-access-token');
          response.cookies.delete('sb-refresh-token');
        } catch (clearError) {
          console.warn('Middleware: Error clearing cookies:', clearError);
        }

        // Only redirect protected routes, allow public routes (/home is public)
        const protectedRoutesFatal = ['/interests', '/subcategories', '/deal-breakers', '/complete', '/reviews', '/write-review', '/saved', '/dm'];
        const isProtectedRoute = protectedRoutesFatal.some(route =>
          request.nextUrl.pathname.startsWith(route)
        ) || request.nextUrl.pathname === '/profile';

        if (isProtectedRoute) {
          return redirectWithGuard(request, new URL('/login', request.url));
        }
        // For public routes, allow access even with fatal error
        return response;
      }

      // For refresh token errors, try to refresh session once
      if (isRefreshError && !isPublicRoute) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData?.session) {
            console.log('Middleware: Successfully refreshed session');
            user = refreshData.session.user;
            return response; // Continue with refreshed session
          }
        } catch (refreshErr) {
          console.warn('Middleware: Failed to refresh session:', refreshErr);
        }
      }

      // For network errors on public routes, allow access
      if (isNetworkError && isPublicRoute) {
        console.warn('Middleware: Network error on public route, allowing access:', error.message);
        return response;
      }

      // For other non-fatal errors, only log if it's unexpected
      const isExpectedError = (
        errorMessage.includes('session missing') ||
        errorMessage.includes('auth session missing') ||
        errorCode === 'session_not_found'
      );

      if (!isExpectedError) {
        console.warn('Middleware: Non-fatal auth error:', error.message);
      }
    } else {
      user = authUser;
    }
  } catch (error) {
    // Handle timeout and unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Middleware: Unexpected error getting user:', errorMessage);

    // For public routes, allow access even on errors
    if (isPublicRoute) {
      console.log('Middleware: Error on public route, allowing access');
      return response;
    }

    // For protected routes, continue without user (will redirect below if needed)
    authError = error instanceof Error ? error : new Error(String(error));
  }

  // Protected routes - require authentication AND email verification
  // /home is public (guest landing); protect actions inside the page instead
  const protectedRoutes = [
    // Onboarding routes
    '/interests', '/subcategories', '/deal-breakers', '/complete',
    // Main app routes (no /home — public)
    '/dashboard', '/saved', '/dm',
    // Content discovery routes
    '/explore', '/for-you', '/trending', '/events-specials',
    // Review routes
    '/write-review', '/reviews',
    // User action routes
    '/notifications', '/add-business', '/add-event', '/add-special', '/claim-business', '/settings', '/admin',
  ];

  // Business routes that require authentication
  const isBusinessReviewRoute = request.nextUrl.pathname.match(/^\/business\/[^\/]+\/review/);
  const isBusinessViewRoute = request.nextUrl.pathname.match(/^\/business\/[^\/]+$/);

  // Check if route is protected
  const isPrivateProfileRoute = pathname === '/profile';
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  ) || isBusinessReviewRoute || isPrivateProfileRoute;

  // Business Owner Routes
  const ownersRoutes = ['/my-businesses', '/owners'];
  const isOwnersRoute = ownersRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  const isBusinessEditRoute = request.nextUrl.pathname.match(/^\/business\/[^\/]+\/edit/);

  const businessAuthRoutes = ['/claim-business', '/add-business', '/add-special'];
  const isBusinessAuthRoute = businessAuthRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Onboarding routes
  const onboardingRoutes = ['/interests', '/subcategories', '/deal-breakers', '/complete', '/onboarding'];
  const isOnboardingRoute = onboardingRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Auth routes
  const authRoutes = ['/login', '/register', '/verify-email'];
  const isAuthRoute = authRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Password reset routes
  const passwordResetRoutes = ['/forgot-password', '/reset-password'];
  const isPasswordResetRoute = passwordResetRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Allow password reset routes regardless of auth status
  if (isPasswordResetRoute) {
    debugLog('ALLOW', { requestId, reason: 'password_reset_route', pathname });
    return response;
  }

  // CRITICAL (iOS crash fix): No user session — avoid redirecting to onboarding/complete (except root "/" default landing). Only protect protected routes → /login; allow public.
  if (!user) {
    if (isAdminRoute) {
      const to = '/login';
      edgeLog('REDIRECT', pathname, { hasUser: false, to, reason: 'guest_admin_route' });
      return redirectWithGuard(request, new URL(to, request.url));
    }
    // Guests should never land on /for-you (empty state can trap navigation on some webviews).
    // Keep /home public; lock personalization to authenticated users only.
    if (pathname === '/for-you' || pathname.startsWith('/for-you/')) {
      const to = '/home';
      edgeLog('REDIRECT', pathname, { hasUser: false, to, reason: 'guest_for_you' });
      return redirectWithGuard(request, new URL(to, request.url));
    }
    if (isPublicRoute) {
      edgeLog('ALLOW', pathname, { hasUser: false });
      return response;
    }
    if (isProtectedRoute) {
      const referer = request.headers.get('referer') || '';
      const cameFromVerifyEmail = referer.includes('/verify-email') || referer.includes('/auth/callback');
      const to = cameFromVerifyEmail ? '/verify-email' : '/login';
      edgeLog('REDIRECT', pathname, { hasUser: false, to });
      return redirectWithGuard(request, new URL(to, request.url));
    }
    // CRITICAL: Guest hitting "/" — middleware must redirect here. Otherwise app/page.tsx runs and we get competing redirect sources (loop on iOS webview).
    if (pathname === '/') {
      const to = '/home';
      edgeLog('REDIRECT', pathname, { hasUser: false, to, reason: 'root_guest' });
      return redirectWithGuard(request, new URL(to, request.url));
    }
    edgeLog('ALLOW', pathname, { hasUser: false });
    return response;
  }

  // ============================================
  // FETCH PROFILE STATUS (only when user exists + email confirmed)
  // Single source of truth for onboarding: profiles.onboarding_completed_at
  // ============================================

  interface ProfileStatus {
    found: boolean;
    onboarding_completed_at: string | null;
    onboarding_step: string | null;
    interests_count: number;
    subcategories_count: number;
    account_role: string | null;
    role: string | null;
  }

  let profileStatus: ProfileStatus | null = null;

  // CRITICAL: Only fetch profile when user exists AND email is confirmed.
  // If email is not confirmed, skip profile fetch entirely - user needs to verify first.
  if (user && user.email_confirmed_at) {
    try {
      const selectWithCompletedAt = 'role, account_role, onboarding_completed_at, onboarding_step, interests_count, subcategories_count';
      const selectMinimal = 'role, account_role';

      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(selectWithCompletedAt)
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError && isSchemaCacheError(profileError)) {
        ({ data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(selectMinimal)
          .eq('user_id', user.id)
          .maybeSingle());
      }

      if (profileError) {
        console.error('[Middleware] Error fetching profile status:', profileError.message);
        profileStatus = null;
      } else if (!profileData) {
        console.warn('[Middleware] Profile missing for authenticated user (race condition likely); allowing request to proceed.');
        profileStatus = null;
      } else {
        profileStatus = {
          found: true,
          onboarding_completed_at:
            'onboarding_completed_at' in profileData
              ? (profileData.onboarding_completed_at as string | null)
              : null,
          onboarding_step: 'onboarding_step' in profileData ? (profileData.onboarding_step as string | null) : null,
          interests_count: typeof (profileData as any).interests_count === 'number' ? (profileData as any).interests_count : 0,
          subcategories_count: typeof (profileData as any).subcategories_count === 'number' ? (profileData as any).subcategories_count : 0,
          account_role: profileData.account_role ?? null,
          role: profileData.role ?? null,
        };
      }
    } catch (error) {
      console.error('[Middleware] Error fetching profile status:', error);
      profileStatus = null;
    }
  }

  const metadataRoleCandidate =
    (user?.user_metadata?.account_type as string | undefined) ||
    (user?.user_metadata?.role as string | undefined) ||
    (user?.app_metadata?.role as string | undefined) ||
    null;

  const resolvedRole =
    normalizeRole(profileStatus?.account_role) ??
    normalizeRole(profileStatus?.role) ??
    normalizeRole(metadataRoleCandidate) ??
    'user';

  // Helper: Check if user is an admin account
  const isAdminAccount = resolvedRole === 'admin';

  // Helper: Check if user is a business account (admin takes priority)
  const isBusinessAccount = !isAdminAccount && resolvedRole === 'business_owner';

  // Helper: Check if onboarding is complete (null when unknown).
  const isOnboardingComplete: boolean | null = profileStatus === null
    ? null
    : Boolean(profileStatus.onboarding_completed_at);

  debugLog('STATUS_COMPUTED', {
    requestId,
    userId: user?.id,
    hasProfileStatus: !!profileStatus,
    isAdminAccount,
    isBusinessAccount,
    isOnboardingComplete,
    onboardingCompletedAt: profileStatus?.onboarding_completed_at ?? null,
    resolvedRole,
  });

  edgeLog('DECISION', pathname, {
    hasUser: !!user,
    emailConfirmed: !!user?.email_confirmed_at,
    isBusiness: isBusinessAccount,
    onboardingComplete: isOnboardingComplete,
  });

  // Server-side hard gate for admin routes.
  // /admin should never render for guests, non-admin users, or unverified users.
  if (isAdminRoute && user) {
    if (!user.email_confirmed_at) {
      return redirectWithGuard(request, new URL('/verify-email', request.url));
    }

    if (!isAdminAccount) {
      // CRITICAL: If profileStatus is null, redirect to /home (safe default)
      // rather than making decisions based on incomplete data
      const fallbackTarget = profileStatus === null
        ? '/home'
        : isBusinessAccount
          ? '/my-businesses'
          : isOnboardingComplete
            ? '/profile'
            : '/interests';

      debugLog('REDIRECT', {
        requestId,
        reason: 'non_admin_on_admin_route',
        to: fallbackTarget,
        profileStatusKnown: profileStatus !== null,
        role: profileStatus?.role,
        account_role: profileStatus?.account_role,
      });
      edgeLog('REDIRECT', pathname, {
        hasUser: true,
        emailConfirmed: true,
        to: fallbackTarget,
        reason: 'non_admin_on_admin_route',
      });
      return redirectWithGuard(request, new URL(fallbackTarget, request.url));
    }
  }

  // ============================================
  // SINGLE DECISION POINT FOR / — no competing redirects in pages
  // Prevents redirect loop (e.g. iPhone Gmail webview: / ↔ /home).
  // Only middleware decides where / goes. One redirect, then return.
  // ============================================
  if (pathname === '/') {
    const to = !user ? '/home' : (isAdminAccount ? '/admin' : isBusinessAccount ? '/my-businesses' : '/home');
    edgeLog('REDIRECT', pathname, { hasUser: !!user, isBusiness: isBusinessAccount, to });
    return redirectWithGuard(request, new URL(to, request.url));
  }

  // ============================================
  // SIMPLIFIED ONBOARDING GUARD LOGIC (only runs when user exists)
  // ============================================

  // RULE 0: Admin accounts go to /admin only
  if (isAdminAccount && user && user.email_confirmed_at) {
    if (isAdminRoute) {
      debugLog('ALLOW', { requestId, reason: 'admin_on_admin_route', pathname });
      return response;
    }
    // Admin on any non-admin route → redirect to /admin
    debugLog('REDIRECT', { requestId, reason: 'admin_on_non_admin_route', to: '/admin' });
    edgeLog('REDIRECT', pathname, { hasUser: true, emailConfirmed: true, to: '/admin' });
    return redirectWithGuard(request, new URL('/admin', request.url));
  }

  // RULE 1: Business accounts NEVER see onboarding routes
  if (isBusinessAccount && user && user.email_confirmed_at) {
    // Block business accounts from all onboarding routes
    if (isOnboardingRoute) {
      debugLog('REDIRECT', { requestId, reason: 'business_on_onboarding_route', to: '/my-businesses' });
      edgeLog('REDIRECT', pathname, { hasUser: true, emailConfirmed: true, isBusiness: true, to: '/my-businesses' });
      return redirectWithGuard(request, new URL('/my-businesses', request.url));
    }

    // Business routes: Always allow
    const isBusinessRoute = ['/claim-business', '/my-businesses', '/add-business', '/add-event', '/add-special', '/settings', '/dm'].some(route =>
      pathname.startsWith(route)
    );
    if (isBusinessRoute) {
      debugLog('ALLOW', { requestId, reason: 'business_on_business_route', pathname });
      return response;
    }

    // Personal discovery routes: redirect business owners to /my-businesses (/home is public; page can show switch if desired)
    const isPersonalRoute = ['/home', '/for-you', '/trending', '/explore', '/events-specials', '/saved', '/write-review'].some(route =>
      pathname === route || pathname.startsWith(route + '/')
    ) || pathname === '/profile';
    if (isPersonalRoute) {
      debugLog('REDIRECT', { requestId, reason: 'business_on_personal_route', to: '/my-businesses' });
      edgeLog('REDIRECT', pathname, { hasUser: true, emailConfirmed: true, isBusiness: true, to: '/my-businesses' });
      return redirectWithGuard(request, new URL('/my-businesses', request.url));
    }

    // Other protected routes: redirect to business home
    if (isProtectedRoute) {
      debugLog('REDIRECT', { requestId, reason: 'business_on_protected_route', to: '/my-businesses' });
      return redirectWithGuard(request, new URL('/my-businesses', request.url));
    }
  }

  // RULE 2: User accounts - enforce onboarding completion (admin already handled in RULE 0)
  if (!isBusinessAccount && !isAdminAccount && user && user.email_confirmed_at) {
    // CRITICAL SAFETY GUARD: If profileStatus is null (profile missing or couldn't be read),
    // DO NOT redirect to onboarding. Allow request to continue so profile sync/bootstrap can complete.
    if (profileStatus === null) {
      debugLog('ALLOW', { requestId, reason: 'profile_status_unknown_race_guard', pathname });
      edgeLog('ALLOW', pathname, {
        hasUser: true,
        emailConfirmed: true,
        onboardingComplete: null,
        reason: 'profile_status_unknown',
      });
      return response;
    }

    // EXPLICIT: Already on valid onboarding path → allow. Never bounce backward to /interests.
    // Exclude /complete — incomplete users on /complete get redirected to /interests below.
    const allowedIncompletePaths = ['/interests', '/subcategories', '/deal-breakers', '/onboarding'];
    const isOnAllowedIncompletePath = allowedIncompletePaths.some(p => pathname === p || pathname.startsWith(p + '/'));
    if (isOnAllowedIncompletePath && !isOnboardingComplete) {
      debugLog('ALLOW', { requestId, reason: 'on_allowed_incomplete_path', pathname });
      return response;
    }

    // If on onboarding route
    if (isOnboardingRoute) {
      // User with complete onboarding should avoid onboarding routes (except /complete celebration page)
      if (isOnboardingComplete) {
        if (pathname === '/complete') {
          debugLog('ALLOW', { requestId, reason: 'completed_user_on_complete', pathname });
          return response;
        }
        debugLog('REDIRECT', { requestId, reason: 'completed_user_on_onboarding', to: '/profile' });
        edgeLog('REDIRECT', pathname, { hasUser: true, emailConfirmed: true, onboardingComplete: true, to: '/profile' });
        return redirectWithGuard(request, new URL('/profile', request.url));
      }
      if (pathname === '/complete') {
        debugLog('REDIRECT', { requestId, reason: 'incomplete_user_on_complete', to: '/interests' });
        edgeLog('REDIRECT', pathname, { hasUser: true, emailConfirmed: true, onboardingComplete: false, to: '/interests' });
        return redirectWithGuard(request, new URL('/interests', request.url));
      }
      // User with incomplete onboarding CAN access onboarding routes
      debugLog('ALLOW', { requestId, reason: 'incomplete_user_on_onboarding', pathname });
      return response;
    }

    // If on protected route (non-onboarding)
    if (isProtectedRoute) {
      // User with complete onboarding can access protected routes
      if (isOnboardingComplete) {
        debugLog('ALLOW', { requestId, reason: 'completed_user_on_protected', pathname });
        return response;
      }

      // User with incomplete onboarding must complete onboarding first
      // At this point profileStatus is NOT null (we checked above), so this is a confirmed incomplete state
      debugLog('REDIRECT', {
        requestId,
        reason: 'incomplete_user_on_protected',
        to: '/interests',
        onboardingCompletedAt: profileStatus.onboarding_completed_at,
      });
      edgeLog('REDIRECT', pathname, { hasUser: true, emailConfirmed: true, onboardingComplete: false, to: '/interests' });
      return redirectWithGuard(request, new URL('/interests', request.url));
    }
  }

  // (Unauthenticated users already returned above)
  if (isPublicRoute) {
    edgeLog('ALLOW', pathname, { hasUser: !!user, emailConfirmed: !!user?.email_confirmed_at });
    // Rewrite /home → / so the root page renders home content (avoids 404 when app/home route fails to resolve)
    if (pathname === '/home') {
      const rewritten = NextResponse.rewrite(new URL('/', request.url));
      rewritten.headers.set('Cache-Control', response.headers.get('Cache-Control') ?? 'no-store, no-cache, must-revalidate');
      rewritten.headers.set('Pragma', response.headers.get('Pragma') ?? 'no-cache');
      rewritten.headers.set('Expires', response.headers.get('Expires') ?? '0');
      return rewritten;
    }
    return response;
  }

  // Redirect authenticated users without email verification from protected routes
  if (isProtectedRoute && user && !user.email_confirmed_at) {
    edgeLog('REDIRECT', pathname, { hasUser: true, emailConfirmed: false, to: '/verify-email' });
    return redirectWithGuard(request, new URL('/verify-email', request.url));
  }

  // Protect owners routes
  if (isOwnersRoute && !user) {
    return redirectWithGuard(request, new URL('/login', request.url));
  }

  if (isOwnersRoute && user && !user.email_confirmed_at) {
    return redirectWithGuard(request, new URL('/verify-email', request.url));
  }

  // Protect business edit routes
  if (isBusinessEditRoute && !user) {
    const redirectUrl = new URL(`/login?redirect=${encodeURIComponent(request.nextUrl.pathname)}`, request.url);
    return redirectWithGuard(request, redirectUrl);
  }

  if (isBusinessEditRoute && user && !user.email_confirmed_at) {
    return redirectWithGuard(request, new URL('/verify-email', request.url));
  }

  if (isBusinessReviewRoute && user && !user.email_confirmed_at) {
    return redirectWithGuard(request, new URL('/verify-email', request.url));
  }

  if (isBusinessAuthRoute && !user) {
    return redirectWithGuard(request, new URL(`/login?redirect=${encodeURIComponent(request.nextUrl.pathname)}`, request.url));
  }

  if (isBusinessAuthRoute && user && !user.email_confirmed_at) {
    return redirectWithGuard(request, new URL('/verify-email', request.url));
  }

  // ROLE-BASED ACCESS CONTROL: Restrict business routes to business accounts only
  // Admin accounts are already redirected to /admin above (RULE 0), so they won't reach here
  if (user && user.email_confirmed_at && !isBusinessAccount && !isAdminAccount) {
    if (isBusinessAuthRoute || isOwnersRoute || isBusinessEditRoute) {
      const redirectTarget = profileStatus === null
        ? '/home'
        : isOnboardingComplete
          ? '/profile'
          : '/interests';
      return redirectWithGuard(request, new URL(redirectTarget, request.url));
    }
  }

  // Auth routes: /verify-email and /login — redirect verified users to correct landing
  if (isAuthRoute && user) {
    if (pathname.startsWith('/verify-email')) {
      if (!user.email_confirmed_at) {
        edgeLog('ALLOW', pathname, { hasUser: true, emailConfirmed: false });
        return response;
      }
      // Verified admin → /admin
      if (isAdminAccount) {
        edgeLog('REDIRECT', pathname, { hasUser: true, emailConfirmed: true, to: '/admin', reason: 'verified_admin' });
        return redirectWithGuard(request, new URL('/admin', request.url));
      }
      // Verified business → /my-businesses
      if (isBusinessAccount) {
        edgeLog('REDIRECT', pathname, { hasUser: true, emailConfirmed: true, isBusiness: true, to: '/my-businesses', reason: 'verified_business' });
        return redirectWithGuard(request, new URL('/my-businesses', request.url));
      }
      if (profileStatus === null) {
        edgeLog('ALLOW', pathname, { hasUser: true, emailConfirmed: true, reason: 'status_unknown' });
        return response;
      }
      const redirectTarget = isOnboardingComplete ? '/profile' : '/interests';
      edgeLog('REDIRECT', pathname, { hasUser: true, emailConfirmed: true, onboardingComplete: isOnboardingComplete, to: redirectTarget });
      return redirectWithGuard(request, new URL(redirectTarget, request.url));
    }

    if (user.email_confirmed_at) {
      let redirectTarget: string;
      if (isAdminAccount) {
        redirectTarget = '/admin';
      } else if (isBusinessAccount) {
        redirectTarget = '/my-businesses';
      } else if (isOnboardingComplete === true) {
        redirectTarget = '/profile';
      } else if (isOnboardingComplete === false) {
        redirectTarget = '/interests';
      } else {
        edgeLog('ALLOW', pathname, { hasUser: true, emailConfirmed: true, reason: 'status_unknown' });
        return response;
      }
      edgeLog('REDIRECT', pathname, { hasUser: true, emailConfirmed: true, isBusiness: isBusinessAccount, onboardingComplete: isOnboardingComplete, to: redirectTarget });
      return redirectWithGuard(request, new URL(redirectTarget, request.url));
    } else {
      return redirectWithGuard(request, new URL('/verify-email', request.url));
    }
  }

  edgeLog('ALLOW', pathname, { hasUser: !!user, emailConfirmed: !!user?.email_confirmed_at });
  return response;
}

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

