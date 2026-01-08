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

  // Note: We check /complete and /home routes below with proper onboarding completion checks
  const pathname = request.nextUrl.pathname;

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
        
        // Only redirect protected routes, allow public routes
        const protectedRoutes = ['/interests', '/subcategories', '/deal-breakers', '/complete', '/home', '/profile', '/reviews', '/write-review', '/leaderboard', '/saved', '/dm', '/reviewer'];
        const isProtectedRoute = protectedRoutes.some(route =>
          request.nextUrl.pathname.startsWith(route)
        );
        
        if (isProtectedRoute) {
          return NextResponse.redirect(new URL('/onboarding', request.url));
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
      
      // For other non-fatal errors, log and continue without user
      console.warn('Middleware: Non-fatal auth error:', error.message);
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
  // These routes should NOT be accessible to unauthenticated users
  const protectedRoutes = [
    // Onboarding routes
    '/interests', '/subcategories', '/deal-breakers', '/complete',
    // Main app routes
    '/home', '/profile', '/saved', '/dm', '/reviewer',
    // Content discovery routes
    '/explore', '/for-you', '/trending', '/events-specials',
    // Review routes
    '/write-review', '/reviews',
    // Leaderboard
    '/leaderboard',
    // Business routes - note: /business/[id] viewing is public, but /business/[id]/review and /business/[id]/edit need auth
    // We'll handle business routes more specifically below
    // Event and special routes
    '/event', '/special',
    // User action routes
    '/notifications', '/add-business', '/claim-business',
  ];
  
  // Business routes that require authentication (review, edit, but NOT viewing)
  const isBusinessReviewRoute = request.nextUrl.pathname.match(/^\/business\/[^\/]+\/review/);
  const isBusinessViewRoute = request.nextUrl.pathname.match(/^\/business\/[^\/]+$/);
  
  // Check if route is protected (excluding public business viewing)
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  ) || isBusinessReviewRoute;

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
  // OPTIMIZED: Single DB read for profile data (no duplicate queries)
  let onboardingAccess = null;
  let profileData: { onboarding_step: string | null; onboarding_complete: boolean | null } | null = null;
  
  if (user && user.email_confirmed_at) {
    try {
      // Single DB read - reuse this data throughout middleware
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_step, onboarding_complete')
        .eq('user_id', user.id)
        .maybeSingle();
      
      profileData = data;
      
      if (profileError) {
        console.error('[Middleware] Error reading profile:', profileError);
        onboardingAccess = getOnboardingAccess(null);
      } else if (profileData) {
        onboardingAccess = getOnboardingAccess({
          onboarding_step: profileData.onboarding_step as any,
          onboarding_complete: profileData.onboarding_complete,
        });
      } else {
        onboardingAccess = getOnboardingAccess(null);
      }
    } catch (error) {
      console.error('[Middleware] Error getting onboarding access:', error);
      onboardingAccess = getOnboardingAccess(null);
    }
  }

  // STRICT: Block access to /home and other protected routes unless onboarding is complete
  if (isProtectedRoute && !isOnboardingRoute && user && user.email_confirmed_at) {
    // Use cached profileData - no additional DB read
    if (profileData?.onboarding_complete === true) {
      return response;
    }
    
    // Redirect to the REQUIRED onboarding step
    const requiredRoute = onboardingAccess?.currentRoute || '/interests';
    const redirectUrl = new URL(requiredRoute, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // STRICT ONBOARDING ROUTE ENFORCEMENT
  if (isOnboardingRoute && user && user.email_confirmed_at && onboardingAccess) {
    const currentPath = request.nextUrl.pathname;

    // RULE 1: If onboarding_complete=true, redirect onboarding routes to /home (except /complete)
    // Use cached profileData - no additional DB read
    if (profileData?.onboarding_complete === true) {
      if (currentPath !== '/complete') {
        const redirectUrl = new URL('/home', request.url);
        return NextResponse.redirect(redirectUrl);
      }
      // Allow /complete page for celebration
      return response;
    }

    // RULE 2: Enforce step-by-step access
    const canAccessRoute = onboardingAccess.canAccess(currentPath);
    const redirectRoute = onboardingAccess.redirectFor(currentPath);

    if (!canAccessRoute && redirectRoute) {
      const redirectUrl = new URL(redirectRoute, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Allow access to current step or earlier steps
    return response;
  }

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !user && !isPublicRoute) {
    const redirectUrl = new URL('/onboarding', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Allow public routes to proceed without authentication
  if (isPublicRoute) {
    return response;
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

  // Protect business review routes - require authentication and email verification
  if (isBusinessReviewRoute && !user) {
    console.log('Middleware: Redirecting unauthenticated user from business review route');
    const redirectUrl = new URL('/onboarding', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (isBusinessReviewRoute && user && !user.email_confirmed_at) {
    console.log('Middleware: Redirecting unverified user from business review route');
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
