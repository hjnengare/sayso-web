import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getOnboardingAccess } from './lib/onboarding/getOnboardingAccess';

export async function middleware(request: NextRequest) {
  // CRITICAL: Disable caching for middleware to prevent stale profile data
  // This is especially important in production (Vercel Edge) where responses can be cached
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  // Add cache control headers to prevent caching of middleware responses
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  // Single-line bypass for celebration and home routes
  const pathname = request.nextUrl.pathname;
  if (pathname === '/home' || pathname === '/complete') {
    return NextResponse.next();
  }

  // CRITICAL: Using ANON KEY in middleware can break profile reads under RLS on Vercel Edge
  // This relies on cookies/JWT being attached correctly at the edge
  // If profile reads fail (profile comes back null), consider:
  // 1. Using service role key (more secure but requires careful RLS setup)
  // 2. Moving onboarding enforcement to server layouts/pages instead of middleware
  // 3. Ensuring RLS policies allow authenticated users to read their own profiles
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

  let user = null;
  try {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    
    // Handle invalid JWT/user errors - clear session
    if (error) {
      const errorMessage = error.message?.toLowerCase() || '';
      if (
        errorMessage.includes('user from sub claim') ||
        errorMessage.includes('jwt does not exist') ||
        errorMessage.includes('user does not exist') ||
        error.code === 'user_not_found'
      ) {
        console.warn('Middleware: Invalid user in JWT, clearing session:', error.message);
        // Clear invalid session cookies
        try {
          response.cookies.delete('sb-access-token');
          response.cookies.delete('sb-refresh-token');
        } catch (clearError) {
          console.warn('Middleware: Error clearing cookies:', clearError);
        }
        // Redirect to onboarding if trying to access protected route
        const protectedRoutes = ['/interests', '/subcategories', '/deal-breakers', '/complete', '/home', '/profile', '/reviews', '/write-review', '/leaderboard', '/saved', '/dm', '/reviewer'];
        const isProtectedRoute = protectedRoutes.some(route =>
          request.nextUrl.pathname.startsWith(route)
        );
        if (isProtectedRoute) {
          return NextResponse.redirect(new URL('/onboarding', request.url));
        }
        return response;
      }
      // For other auth errors, continue without user
      console.warn('Middleware: Auth error (non-fatal):', error.message);
    } else {
      user = authUser;
    }
  } catch (error) {
    console.error('Middleware: Unexpected error getting user:', error);
    // Continue without user - will redirect if needed below
  }

  console.log('Middleware: Checking route', {
    pathname: request.nextUrl.pathname,
    user_exists: !!user,
    email_confirmed_at: user?.email_confirmed_at
  });

  // Protected routes - require authentication AND email verification
  const protectedRoutes = ['/interests', '/subcategories', '/deal-breakers', '/complete', '/home', '/profile', '/reviews', '/write-review', '/leaderboard', '/saved', '/dm', '/reviewer'];
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Business owner routes - require authentication, email verification, AND business ownership
  // Note: Ownership verification is done in components using useRequireBusinessOwner
  const ownersRoutes = ['/owners'];
  const isOwnersRoute = ownersRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );
  
  // Business edit route - requires authentication and ownership (ownership checked in component)
  const isBusinessEditRoute = request.nextUrl.pathname.match(/^\/business\/[^\/]+\/edit/);
  
  // Business login route - allow access but redirect if already logged in
  const isBusinessLoginRoute = request.nextUrl.pathname.startsWith('/business/login');
  
  // Business routes that require authentication (but ownership is checked in component)
  const businessAuthRoutes = ['/for-businesses'];
  const isBusinessAuthRoute = businessAuthRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );
  
  // Business profile pages are public - no protection needed
  // Only /business/[id]/edit and /owners/* need protection

  // Onboarding routes - users who completed onboarding should be redirected
  const onboardingRoutes = ['/interests', '/subcategories', '/deal-breakers', '/complete', '/onboarding'];
  const isOnboardingRoute = onboardingRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Auth routes - redirect authenticated users away
  const authRoutes = ['/login', '/register', '/verify-email'];
  const isAuthRoute = authRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Password reset routes - allow access regardless of auth status
  const passwordResetRoutes = ['/forgot-password', '/reset-password'];
  const isPasswordResetRoute = passwordResetRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Allow password reset routes regardless of auth status
  if (isPasswordResetRoute) {
    console.log('Middleware: Allowing access to password reset route');
    return response;
  }

  // STRICT STATE MACHINE: Use onboarding_step as SINGLE source of truth
  // Counts are for UI display only, NOT for routing decisions
  // CRITICAL: Always read fresh data - no caching allowed
  let onboardingAccess = null;
  if (user && user.email_confirmed_at) {
    try {
      // Force fresh read - CRITICAL: Always read latest data, no caching
      // Use maybeSingle() to handle cases where profile doesn't exist yet
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_step, onboarding_complete')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('[Middleware] Error reading profile:', profileError);
        // On error, default to requiring interests step
        onboardingAccess = getOnboardingAccess(null);
        console.log('[Middleware] Profile read error, defaulting to interests step');
      } else if (profileData) {
        onboardingAccess = getOnboardingAccess({
          onboarding_step: profileData.onboarding_step,
          onboarding_complete: profileData.onboarding_complete,
        });
        
        const requestedPath = request.nextUrl.pathname;
        const redirectRoute = onboardingAccess.redirectFor(requestedPath);
        
        console.log('[Middleware] Onboarding access determined:', {
          onboarding_step: profileData.onboarding_step,
          onboarding_complete: profileData.onboarding_complete,
          requiredStep: onboardingAccess.step,
          requiredRoute: onboardingAccess.currentRoute,
          requestedPath,
          willRedirect: redirectRoute !== null,
          redirectTo: redirectRoute
        });
      } else {
        // No profile found, default to requiring interests step
        onboardingAccess = getOnboardingAccess(null);
        console.log('[Middleware] No profile found, defaulting to interests step');
      }
    } catch (error) {
      console.error('[Middleware] Error getting onboarding access:', error);
      // On error, default to requiring interests step
      onboardingAccess = getOnboardingAccess(null);
    }
  }

  // STRICT: Block access to /home and other protected routes unless onboarding is complete
  if (isProtectedRoute && !isOnboardingRoute && user && user.email_confirmed_at) {
    if (onboardingAccess && onboardingAccess.step === 'complete' && onboardingAccess.canAccess('/complete')) {
      // Check if onboarding_complete flag is true (user finished /complete page)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('onboarding_complete')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profileData?.onboarding_complete === true) {
        console.log('[Middleware] User has completed onboarding, allowing access to protected route');
        return response;
      }
    }
    
    // Otherwise, redirect to the REQUIRED onboarding step
    const requiredRoute = onboardingAccess?.currentRoute || '/interests';
    console.log('[Middleware] User has not completed onboarding, redirecting to required step:', {
      requiredRoute,
      pathname: request.nextUrl.pathname
    });
    const redirectUrl = new URL(requiredRoute, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // STRICT STATE MACHINE: Enforce onboarding route access rules
  if (isOnboardingRoute && user && user.email_confirmed_at) {
    const currentPath = request.nextUrl.pathname;

    if (!onboardingAccess) {
      // Fallback: redirect to interests if we can't determine access
      console.log('[Middleware] Cannot determine onboarding access, redirecting to interests');
      const redirectUrl = new URL('/interests', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // RULE 1: If onboarding_complete=true, redirect ALL onboarding routes to /home
    const { data: profileData } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (profileData?.onboarding_complete === true) {
      // Allow /complete page for celebration, but redirect other onboarding routes to home
      if (currentPath !== '/complete') {
        console.log('[Middleware] User completed onboarding, redirecting to home');
        const redirectUrl = new URL('/home', request.url);
        return NextResponse.redirect(redirectUrl);
      }
      // Allow /complete page even if already complete (for celebration)
      console.log('[Middleware] Allowing access to /complete page (celebration)');
      return response;
    }

    // RULE 2: Check if user is trying to skip ahead (access later step)
    const redirectRoute = onboardingAccess.redirectFor(currentPath);
    if (redirectRoute) {
      console.log('[Middleware] Blocking skip ahead - redirecting to required step:', {
        currentPath,
        requiredRoute: redirectRoute,
        requiredStep: onboardingAccess.step
      });
      const redirectUrl = new URL(redirectRoute, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // RULE 3: Allow access if:
    // - User is on their required step (currentPath === requiredRoute)
    // - User is going backward (currentPath is earlier step)
    console.log('[Middleware] Allowing access to onboarding route:', {
      currentPath,
      requiredStep: onboardingAccess.step,
      requiredRoute: onboardingAccess.currentRoute
    });
    return response;
  }

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !user) {
    console.log('Middleware: Redirecting unauthenticated user to onboarding');
    const redirectUrl = new URL('/onboarding', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users without email verification from protected routes
  if (isProtectedRoute && user && !user.email_confirmed_at) {
    console.log('Middleware: Redirecting unverified user to verify-email');
    const redirectUrl = new URL('/verify-email', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Protect owners routes - require authentication and email verification
  // Note: Ownership verification is done in the component using useRequireBusinessOwner
  if (isOwnersRoute && !user) {
    console.log('Middleware: Redirecting unauthenticated user from owners route');
    const redirectUrl = new URL('/business/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (isOwnersRoute && user && !user.email_confirmed_at) {
    console.log('Middleware: Redirecting unverified user from owners route');
    const redirectUrl = new URL('/verify-email', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Protect business edit routes - require authentication and email verification
  // Note: Ownership verification is done in the component using useRequireBusinessOwner
  if (isBusinessEditRoute && !user) {
    console.log('Middleware: Redirecting unauthenticated user from business edit route');
    const businessId = request.nextUrl.pathname.match(/^\/business\/([^\/]+)\/edit/)?.[1];
    const redirectUrl = new URL(`/business/login?redirect=${encodeURIComponent(request.nextUrl.pathname)}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (isBusinessEditRoute && user && !user.email_confirmed_at) {
    console.log('Middleware: Redirecting unverified user from business edit route');
    const redirectUrl = new URL('/verify-email', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Business login route - redirect authenticated users to owners dashboard
  if (isBusinessLoginRoute && user && user.email_confirmed_at) {
    // Check if user has businesses, redirect to owners if they do
    try {
      const { data: owners } = await supabase
        .from('business_owners')
        .select('business_id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (owners && owners.length > 0) {
        console.log('Middleware: Authenticated business owner on login page, redirecting to owners');
        const redirectUrl = new URL('/owners', request.url);
        return NextResponse.redirect(redirectUrl);
      }
    } catch (error) {
      console.error('Middleware: Error checking business ownership:', error);
      // Continue - allow access to login page
    }
  }

  // Protect business auth routes (for-businesses) - require authentication
  if (isBusinessAuthRoute && !user) {
    console.log('Middleware: Redirecting unauthenticated user from for-businesses route');
    const redirectUrl = new URL('/business/login?redirect=/for-businesses', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (isBusinessAuthRoute && user && !user.email_confirmed_at) {
    console.log('Middleware: Redirecting unverified user from for-businesses route');
    const redirectUrl = new URL('/verify-email', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users from auth pages
  if (isAuthRoute && user) {
    // Allow access to verify-email page regardless of verification status
    if (request.nextUrl.pathname.startsWith('/verify-email')) {
      console.log('Middleware: Allowing access to verify-email page');
      return response;
    }

    if (user.email_confirmed_at) {
      console.log('Middleware: Redirecting verified user to interests');
      const redirectUrl = new URL('/interests', request.url);
      return NextResponse.redirect(redirectUrl);
    } else {
      console.log('Middleware: Redirecting unverified user to verify-email');
      const redirectUrl = new URL('/verify-email', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

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
