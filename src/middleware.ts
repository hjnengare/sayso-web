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
        
        // Check if this is a guest mode request (guest=true query param)
        const isGuestMode = request.nextUrl.searchParams.get('guest') === 'true';
        
        // Only redirect protected routes, allow public routes
        // Special case: /home with guest=true is allowed even though /home is typically protected
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
      
      // For other non-fatal errors, only log if it's unexpected
      // "Auth session missing" is expected for unauthenticated users, don't log it
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
    '/notifications', '/add-business', '/claim-business', '/settings',
  ];
  
  // Business routes that require authentication (review, edit, but NOT viewing)
  const isBusinessReviewRoute = request.nextUrl.pathname.match(/^\/business\/[^\/]+\/review/);
  const isBusinessViewRoute = request.nextUrl.pathname.match(/^\/business\/[^\/]+$/);
  
  // Check if route is protected (excluding public business viewing)
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  ) || isBusinessReviewRoute;

  // ============================================
  // BUSINESS OWNER ROUTES - Professional Business Management
  // ============================================
  // Route Structure:
  //   /claim-business     → Primary Business Dashboard (landing/overview for business owners)
  //   /my-businesses      → Business Owner Hub (main management interface)
  //   /my-businesses/businesses/[id] → Individual Business Management (specific business controls)
  //   /my-businesses/businesses/[id]/reviews → Business Reviews Management (review responses & insights)
  //   /owners* (legacy)   → Temporary redirect to /my-businesses*
  //
  // Access Requirements:
  //   - All business routes require authentication
  //   - /my-businesses/* routes verify business ownership at component level
  //   - /business/[id]/edit verifies ownership at component level
  // ============================================

  // Business Owner Hub - requires authentication, email verification, and business ownership
  // Ownership verification is done in components using useRequireBusinessOwner
  const ownersRoutes = ['/my-businesses', '/owners'];
  const isOwnersRoute = ownersRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );
  
  // Business edit route - requires authentication and ownership (verified in component)
  const isBusinessEditRoute = request.nextUrl.pathname.match(/^\/business\/[^\/]+\/edit/);
  
  // Primary Business Dashboard (/claim-business) - requires authentication
  // This is the main landing page for business owners
  const businessAuthRoutes = ['/claim-business'];
  const isBusinessAuthRoute = businessAuthRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );
  
  // Business profile pages are public - no protection needed
  // Only /business/[id]/edit and /my-businesses/* (legacy /owners/*) need protection

  // Onboarding routes - users who completed onboarding should be redirected
  const onboardingRoutes = ['/interests', '/subcategories', '/deal-breakers', '/complete', '/onboarding'];
  const isOnboardingRoute = onboardingRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Account type selection route - allow new OAuth users to access
  const isAccountTypeSelection = request.nextUrl.pathname.startsWith('/onboarding/select-account-type');

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
  let profileData: { onboarding_step: string | null; onboarding_complete: boolean | null; role?: string | null; current_role?: string | null } | null = null;
  
  if (user && user.email_confirmed_at) {
    try {
      // Single DB read - reuse this data throughout middleware
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_step, onboarding_complete, role, current_role')
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
    const userCurrentRole = profileData?.current_role || 'user';
    
    // Business owners have different access rules
    if (userCurrentRole === 'business_owner') {
      // Business routes: Always allow without onboarding
      const isBusinessRoute = ['/claim-business', '/my-businesses', '/add-business', '/settings'].some(route =>
        request.nextUrl.pathname.startsWith(route)
      );
      
      if (isBusinessRoute) {
        return response; // Allow access to business routes
      }
      
      // Direct Messages: ALLOW (business-customer communication)
      if (request.nextUrl.pathname.startsWith('/dm')) {
        return response;
      }
      
      // Personal discovery routes: BLOCK business owners
      const isPersonalDiscoveryRoute = request.nextUrl.pathname === '/home' ||
                                       request.nextUrl.pathname.startsWith('/for-you') ||
                                       request.nextUrl.pathname.startsWith('/trending') ||
                                       request.nextUrl.pathname.startsWith('/explore') ||
                                       request.nextUrl.pathname.startsWith('/leaderboard') ||
                                       request.nextUrl.pathname.startsWith('/events-specials');
      
      if (isPersonalDiscoveryRoute) {
        console.log('Middleware: Blocking business owner from personal discovery route:', request.nextUrl.pathname);
        const redirectUrl = new URL('/claim-business', request.url);
        return NextResponse.redirect(redirectUrl);
      }
      
      // Personal-only features: BLOCK business owners
      const isPersonalOnlyRoute = request.nextUrl.pathname.startsWith('/profile') ||
                                  request.nextUrl.pathname.startsWith('/saved') ||
                                  request.nextUrl.pathname.startsWith('/write-review') ||
                                  request.nextUrl.pathname.startsWith('/reviewer');
      
      if (isPersonalOnlyRoute) {
        console.log('Middleware: Blocking business owner from personal-only route:', request.nextUrl.pathname);
        const redirectUrl = new URL('/my-businesses', request.url);
        return NextResponse.redirect(redirectUrl);
      }
      
      // All other routes: block by default (strict mode)
      console.log('Middleware: Blocking business owner from unspecified route:', request.nextUrl.pathname);
      const redirectUrl = new URL('/my-businesses', request.url);
      return NextResponse.redirect(redirectUrl);
    }
    
    // For personal users, check onboarding completion
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

    // RULE 1: If onboarding_complete=true, redirect onboarding routes based on role
    // Use cached profileData - no additional DB read
    if (profileData?.onboarding_complete === true) {
      if (currentPath !== '/complete') {
        const userCurrentRole = profileData?.current_role || 'user';
        const destination = userCurrentRole === 'business_owner' ? '/claim-business' : '/home';
        const redirectUrl = new URL(destination, request.url);
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

  // Check for guest mode to allow /home access without authentication
  const isGuestMode = request.nextUrl.searchParams.get('guest') === 'true';
  const isGuestModeHome = isGuestMode && request.nextUrl.pathname === '/home';

  // Redirect unauthenticated users from protected routes (except for guest mode /home)
  if (isProtectedRoute && !user && !isPublicRoute && !isGuestModeHome) {
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
    console.log('Middleware: Redirecting unauthenticated user from owner routes');
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (isOwnersRoute && user && !user.email_confirmed_at) {
    console.log('Middleware: Redirecting unverified user from owner routes');
    const redirectUrl = new URL('/verify-email', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Protect business edit routes - require authentication and email verification
  // Note: Ownership verification is done in the component using useRequireBusinessOwner
  if (isBusinessEditRoute && !user) {
    console.log('Middleware: Redirecting unauthenticated user from business edit route');
    const businessId = request.nextUrl.pathname.match(/^\/business\/([^\/]+)\/edit/)?.[1];
    const redirectUrl = new URL(`/login?redirect=${encodeURIComponent(request.nextUrl.pathname)}`, request.url);
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
  

  // Protect business auth routes (claim-business) - require authentication
  if (isBusinessAuthRoute && !user) {
    console.log('Middleware: Redirecting unauthenticated user from claim-business route');
    const redirectUrl = new URL('/login?redirect=/claim-business', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (isBusinessAuthRoute && user && !user.email_confirmed_at) {
    console.log('Middleware: Redirecting unverified user from claim-business route');
    const redirectUrl = new URL('/verify-email', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // ROLE-BASED ACCESS CONTROL: Enforce business routes to business accounts only
  // ONLY restrict if trying to access business routes as a personal user
  if (isBusinessAuthRoute && user && user.email_confirmed_at) {
    const userCurrentRole = profileData?.current_role || 'user';
    if (userCurrentRole !== 'business_owner') {
      console.log('Middleware: Restricting non-business account from /claim-business');
      const redirectUrl = new URL('/home', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // ROLE-BASED ACCESS CONTROL: Restrict /my-businesses (and legacy /owners) routes to business accounts only
  // ONLY restrict if trying to access business routes as a personal user
  if (isOwnersRoute && user && user.email_confirmed_at) {
    const userCurrentRole = profileData?.current_role || 'user';
    if (userCurrentRole !== 'business_owner') {
      console.log('Middleware: Restricting non-business account from /my-businesses routes');
      const redirectUrl = new URL('/home', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // ROLE-BASED ACCESS CONTROL: Restrict /business/[id]/edit to business owners
  // ONLY restrict if trying to access edit as a personal user
  if (isBusinessEditRoute && user && user.email_confirmed_at) {
    const userCurrentRole = profileData?.current_role || 'user';
    if (userCurrentRole !== 'business_owner') {
      console.log('Middleware: Restricting non-business account from business edit route');
      const redirectUrl = new URL('/home', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // ROLE-BASED ACCESS CONTROL: Restrict personal-only onboarding routes from business accounts
  // Business owners should NOT access personal onboarding (interests, deal-breakers, etc)
  const isPersonalOnboardingRoute = request.nextUrl.pathname.startsWith('/interests') || 
                                    request.nextUrl.pathname.startsWith('/subcategories') ||
                                    request.nextUrl.pathname.startsWith('/deal-breakers') ||
                                    request.nextUrl.pathname.startsWith('/complete');

  if (isPersonalOnboardingRoute && user && user.email_confirmed_at) {
    const userCurrentRole = profileData?.current_role || 'user';
    if (userCurrentRole === 'business_owner') {
      console.log('Middleware: Restricting business account from personal onboarding');
      const redirectUrl = new URL('/claim-business', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Allow account type selection for new OAuth users (even if authenticated)
  if (isAccountTypeSelection) {
    console.log('Middleware: Allowing access to account type selection page');
    return response;
  }

  // Redirect authenticated users from auth pages
  if (isAuthRoute && user) {
    // Allow access to verify-email page regardless of verification status
    if (request.nextUrl.pathname.startsWith('/verify-email')) {
      console.log('Middleware: Allowing access to verify-email page');
      return response;
    }

    if (user.email_confirmed_at) {
      const userCurrentRole = profileData?.current_role || 'user';
      const redirectTarget = userCurrentRole === 'business_owner' ? '/claim-business' : '/interests';
      console.log('Middleware: Redirecting verified user from auth page to', redirectTarget, 'for role', userCurrentRole);
      const redirectUrl = new URL(redirectTarget, request.url);
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
