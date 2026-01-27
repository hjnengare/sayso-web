import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * SIMPLIFIED ONBOARDING GUARD
 *
 * Single source of truth: profiles.onboarding_completed_at (timestamp)
 *
 * Rules:
 * 1. Not logged in → redirect to /auth/login (for protected routes)
 * 2. Business account (account_role === 'business_owner') → NEVER see onboarding, redirect to /my-businesses
 * 3. User account with onboarding_completed_at = null → force to /interests
 * 4. User account with onboarding_completed_at != null → block onboarding routes, redirect to /complete
 * 5. Missing profile → treat as onboarding_completed_at = null
 *
 * MOBILE HARD REFRESH FIX:
 * Uses get_onboarding_status RPC with SECURITY DEFINER to bypass RLS issues
 * that can occur when the Supabase client auth context isn't fully established
 * on mobile hard refresh, even though getUser() succeeds.
 */

// Debug logging helper - enable in development or when debugging
const DEBUG_MIDDLEWARE = process.env.NODE_ENV === 'development' || process.env.DEBUG_MIDDLEWARE === 'true';

function debugLog(context: string, data: Record<string, unknown>) {
  if (DEBUG_MIDDLEWARE) {
    console.log(`[Middleware:${context}]`, JSON.stringify(data, null, 2));
  }
}

function isSchemaCacheError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('schema cache') && message.includes('onboarding_completed_at');
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestId = Math.random().toString(36).substring(7); // For tracing requests

  const PUBLIC_AUTH_ROUTES = [
    '/login',
    '/register',
    '/business/login',
    '/business/register',
    '/verify-email',
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

  // Define public routes that should always be accessible
  const publicRoutes = [
    '/business/',
    '/event/',
    '/special/',
    '/category/',
    '/explore/',
    '/trending',
    '/for-you',
    '/notifications',
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

        // Check if this is a guest mode request (guest=true query param)
        const isGuestMode = request.nextUrl.searchParams.get('guest') === 'true';

        // Only redirect protected routes, allow public routes
        const protectedRoutes = ['/interests', '/subcategories', '/deal-breakers', '/complete', '/home', '/profile', '/reviews', '/write-review', '/leaderboard', '/saved', '/dm', '/reviewer'];
        const isProtectedRoute = protectedRoutes.some(route =>
          request.nextUrl.pathname.startsWith(route)
        );

        // Allow /home if guest mode is enabled
        if (isProtectedRoute && request.nextUrl.pathname === '/home' && isGuestMode) {
          console.log('Middleware: Allowing guest mode access to /home');
          return response;
        }

        if (isProtectedRoute) {
          return NextResponse.redirect(new URL('/login', request.url));
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
  const protectedRoutes = [
    // Onboarding routes
    '/interests', '/subcategories', '/deal-breakers', '/complete',
    // Main app routes
    '/home', '/dashboard', '/profile', '/saved', '/dm', '/reviewer',
    // Content discovery routes
    '/explore', '/for-you', '/trending', '/events-specials',
    // Review routes
    '/write-review', '/reviews',
    // Leaderboard
    '/leaderboard',
    // Event and special routes
    '/event', '/special',
    // User action routes
    '/notifications', '/add-business', '/claim-business', '/settings',
  ];

  // Business routes that require authentication
  const isBusinessReviewRoute = request.nextUrl.pathname.match(/^\/business\/[^\/]+\/review/);
  const isBusinessViewRoute = request.nextUrl.pathname.match(/^\/business\/[^\/]+$/);

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  ) || isBusinessReviewRoute;

  // Business Owner Routes
  const ownersRoutes = ['/my-businesses', '/owners'];
  const isOwnersRoute = ownersRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  const isBusinessEditRoute = request.nextUrl.pathname.match(/^\/business\/[^\/]+\/edit/);

  const businessAuthRoutes = ['/claim-business'];
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

  // ============================================
  // FETCH ONBOARDING STATUS USING RPC
  // This uses SECURITY DEFINER to bypass RLS issues on mobile hard refresh
  // ============================================

  interface OnboardingStatus {
    found: boolean;
    onboarding_complete: boolean;
    onboarding_completed_at?: string | null;
    account_role: string;
    role: string;
    interests_count: number;
    subcategories_count: number;
    dealbreakers_count: number;
    error?: string;
  }

  let onboardingStatus: OnboardingStatus | null = null;

  if (user && user.email_confirmed_at) {
    try {
      // Use RPC function instead of direct table query
      // This bypasses RLS issues that can occur on mobile hard refresh
      const { data, error: rpcError } = await supabase
        .rpc('get_onboarding_status', { p_user_id: user.id });

      debugLog('RPC_RESULT', {
        requestId,
        userId: user.id,
        rpcData: data,
        rpcError: rpcError?.message,
      });

      if (rpcError) {
        console.error('[Middleware] RPC error fetching onboarding status:', rpcError);
        // Fallback: try direct query (may fail on mobile, but worth a try)
        const selectWithCompletedAt = 'onboarding_complete, onboarding_completed_at, role, account_role, interests_count, subcategories_count, dealbreakers_count';
        const selectWithoutCompletedAt = 'onboarding_complete, role, account_role, interests_count, subcategories_count, dealbreakers_count';
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(selectWithCompletedAt)
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError && isSchemaCacheError(profileError)) {
          ({ data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select(selectWithoutCompletedAt)
            .eq('user_id', user.id)
            .maybeSingle());
        }

        debugLog('FALLBACK_QUERY', {
          requestId,
          profileData,
          profileError: profileError?.message,
        });

        if (profileError || !profileData) {
          // CRITICAL: If we can't determine status, DO NOT redirect to onboarding
          // Instead, allow the request and let the page handle it
          console.warn('[Middleware] Cannot determine onboarding status, allowing request to proceed');
          onboardingStatus = null;
        } else {
          onboardingStatus = {
            found: true,
            onboarding_complete: profileData.onboarding_complete ?? false,
            onboarding_completed_at: profileData.onboarding_completed_at ?? null,
            account_role: profileData.account_role ?? 'user',
            role: profileData.role ?? 'user',
            interests_count: profileData.interests_count ?? 0,
            subcategories_count: profileData.subcategories_count ?? 0,
            dealbreakers_count: profileData.dealbreakers_count ?? 0,
          };
        }
      } else if (data) {
        onboardingStatus = data as OnboardingStatus;
      } else {
        // No data returned - treat as no profile
        onboardingStatus = {
          found: false,
          onboarding_complete: false,
          account_role: 'user',
          role: 'user',
          interests_count: 0,
          subcategories_count: 0,
          dealbreakers_count: 0,
        };
      }
    } catch (error) {
      console.error('[Middleware] Error fetching onboarding status:', error);
      // CRITICAL: On error, DO NOT redirect to onboarding
      // This prevents the mobile hard refresh bug
      onboardingStatus = null;
    }
  }

  // Helper: Check if user is a business account
  const isBusinessAccount =
    onboardingStatus?.role === 'business_owner' ||
    onboardingStatus?.account_role === 'business_owner';

  // Helper: Check if onboarding is complete
  // If we couldn't fetch status (onboardingStatus is null), default to incomplete
  const isOnboardingComplete = onboardingStatus === null
    ? false
    : onboardingStatus.onboarding_complete === true;

  debugLog('STATUS_COMPUTED', {
    requestId,
    userId: user?.id,
    hasOnboardingStatus: !!onboardingStatus,
    isBusinessAccount,
    isOnboardingComplete,
    rawOnboardingComplete: onboardingStatus?.onboarding_complete,
    onboardingCompletedAt: onboardingStatus?.onboarding_completed_at,
  });

  // ============================================
  // SIMPLIFIED ONBOARDING GUARD LOGIC
  // ============================================

  // RULE 1: Business accounts NEVER see onboarding routes
  if (isBusinessAccount && user && user.email_confirmed_at) {
    // Block business accounts from all onboarding routes
    if (isOnboardingRoute) {
      debugLog('REDIRECT', { requestId, reason: 'business_on_onboarding_route', to: '/my-businesses' });
      return NextResponse.redirect(new URL('/my-businesses', request.url));
    }

    // Business routes: Always allow
    const isBusinessRoute = ['/claim-business', '/my-businesses', '/add-business', '/settings', '/dm'].some(route =>
      pathname.startsWith(route)
    );
    if (isBusinessRoute) {
      debugLog('ALLOW', { requestId, reason: 'business_on_business_route', pathname });
      return response;
    }

    // Personal discovery routes: Block business owners
    const isPersonalRoute = ['/home', '/for-you', '/trending', '/explore', '/leaderboard', '/events-specials', '/profile', '/saved', '/write-review', '/reviewer'].some(route =>
      pathname === route || pathname.startsWith(route + '/')
    );
    if (isPersonalRoute) {
      debugLog('REDIRECT', { requestId, reason: 'business_on_personal_route', to: '/my-businesses' });
      return NextResponse.redirect(new URL('/my-businesses', request.url));
    }

    // Other protected routes: redirect to business home
    if (isProtectedRoute) {
      debugLog('REDIRECT', { requestId, reason: 'business_on_protected_route', to: '/my-businesses' });
      return NextResponse.redirect(new URL('/my-businesses', request.url));
    }
  }

  // RULE 2: User accounts - enforce onboarding completion
  if (!isBusinessAccount && user && user.email_confirmed_at) {
    // If on onboarding route
    if (isOnboardingRoute) {
      // User with complete onboarding should only see /complete
      if (isOnboardingComplete) {
        if (pathname === '/complete') {
          debugLog('ALLOW', { requestId, reason: 'completed_user_on_complete', pathname });
          return response;
        }
        debugLog('REDIRECT', { requestId, reason: 'completed_user_on_onboarding', to: '/complete' });
        return NextResponse.redirect(new URL('/complete', request.url));
      }
      if (pathname === '/complete') {
        debugLog('REDIRECT', { requestId, reason: 'incomplete_user_on_complete', to: '/onboarding' });
        return NextResponse.redirect(new URL('/onboarding', request.url));
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
      // CRITICAL: Only redirect if we have confirmed incomplete status
      if (onboardingStatus !== null && !isOnboardingComplete) {
        debugLog('REDIRECT', {
          requestId,
          reason: 'incomplete_user_on_protected',
          to: '/interests',
          onboardingStatus,
        });
        console.log('[Middleware] Incomplete user redirected to onboarding from:', pathname, {
          userId: user.id,
          onboardingComplete: onboardingStatus.onboarding_complete,
          interestsCount: onboardingStatus.interests_count,
          subcategoriesCount: onboardingStatus.subcategories_count,
          dealbreakersCount: onboardingStatus.dealbreakers_count,
        });
        return NextResponse.redirect(new URL('/interests', request.url));
      }
      // If onboardingStatus is null (couldn't fetch), allow access
      debugLog('ALLOW', { requestId, reason: 'status_unknown_allow_access', pathname });
      return response;
    }
  }

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !user && !isPublicRoute) {
    const referer = request.headers.get('referer') || '';
    const cameFromVerifyEmail =
      referer.includes('/verify-email') || referer.includes('/auth/callback');
    const redirectTarget = cameFromVerifyEmail ? '/verify-email' : '/login';
    debugLog('REDIRECT', { requestId, reason: 'unauthenticated_on_protected', to: redirectTarget });
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  }

  // Allow public routes to proceed without authentication
  if (isPublicRoute) {
    debugLog('ALLOW', { requestId, reason: 'public_route', pathname });
    return response;
  }

  // Redirect authenticated users without email verification from protected routes
  if (isProtectedRoute && user && !user.email_confirmed_at) {
    debugLog('REDIRECT', { requestId, reason: 'unverified_email', to: '/verify-email' });
    return NextResponse.redirect(new URL('/verify-email', request.url));
  }

  // Protect owners routes
  if (isOwnersRoute && !user) {
    debugLog('REDIRECT', { requestId, reason: 'unauthenticated_on_owners', to: '/login' });
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isOwnersRoute && user && !user.email_confirmed_at) {
    debugLog('REDIRECT', { requestId, reason: 'unverified_on_owners', to: '/verify-email' });
    return NextResponse.redirect(new URL('/verify-email', request.url));
  }

  // Protect business edit routes
  if (isBusinessEditRoute && !user) {
    const redirectUrl = new URL(`/login?redirect=${encodeURIComponent(request.nextUrl.pathname)}`, request.url);
    debugLog('REDIRECT', { requestId, reason: 'unauthenticated_on_business_edit', to: redirectUrl.pathname });
    return NextResponse.redirect(redirectUrl);
  }

  if (isBusinessEditRoute && user && !user.email_confirmed_at) {
    debugLog('REDIRECT', { requestId, reason: 'unverified_on_business_edit', to: '/verify-email' });
    return NextResponse.redirect(new URL('/verify-email', request.url));
  }

  // Protect business review routes
  if (isBusinessReviewRoute && !user) {
    debugLog('REDIRECT', { requestId, reason: 'unauthenticated_on_review', to: '/login' });
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isBusinessReviewRoute && user && !user.email_confirmed_at) {
    debugLog('REDIRECT', { requestId, reason: 'unverified_on_review', to: '/verify-email' });
    return NextResponse.redirect(new URL('/verify-email', request.url));
  }

  // Protect business auth routes (claim-business)
  if (isBusinessAuthRoute && !user) {
    debugLog('REDIRECT', { requestId, reason: 'unauthenticated_on_claim', to: '/login' });
    return NextResponse.redirect(new URL('/login?redirect=/claim-business', request.url));
  }

  if (isBusinessAuthRoute && user && !user.email_confirmed_at) {
    debugLog('REDIRECT', { requestId, reason: 'unverified_on_claim', to: '/verify-email' });
    return NextResponse.redirect(new URL('/verify-email', request.url));
  }

  // ROLE-BASED ACCESS CONTROL: Restrict business routes to business accounts only
  if (user && user.email_confirmed_at && !isBusinessAccount) {
    // Personal users cannot access business-only routes
    if (isBusinessAuthRoute || isOwnersRoute || isBusinessEditRoute) {
      const redirectTarget = isOnboardingComplete ? '/complete' : '/interests';
      debugLog('REDIRECT', { requestId, reason: 'personal_user_on_business_route', to: redirectTarget });
      return NextResponse.redirect(new URL(redirectTarget, request.url));
    }
  }

  // Redirect authenticated users from auth pages
  if (isAuthRoute && user) {
    // Allow access to verify-email page regardless of verification status
    if (pathname.startsWith('/verify-email')) {
      debugLog('ALLOW', { requestId, reason: 'verify_email_page', pathname });
      return response;
    }

    if (user.email_confirmed_at) {
      // Determine correct redirect based on account type and onboarding status
      let redirectTarget: string;
      if (isBusinessAccount) {
        redirectTarget = '/my-businesses';
      } else if (isOnboardingComplete) {
        redirectTarget = '/complete';
      } else {
        redirectTarget = '/interests';
      }
      debugLog('REDIRECT', { requestId, reason: 'authenticated_on_auth_route', to: redirectTarget });
      return NextResponse.redirect(new URL(redirectTarget, request.url));
    } else {
      debugLog('REDIRECT', { requestId, reason: 'unverified_on_auth_route', to: '/verify-email' });
      return NextResponse.redirect(new URL('/verify-email', request.url));
    }
  }

  debugLog('ALLOW', { requestId, reason: 'default_allow', pathname });
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

