import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

  // Derive onboarding state from profile counts (source of truth)
  // This uses the count fields in profiles table which are maintained by triggers/RPC functions
  let onboardingState = null;
  let onboardingComplete = false;
  if (user && user.email_confirmed_at) {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('onboarding_step, onboarding_complete, interests_count, subcategories_count, dealbreakers_count')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profileData) {
        const interestsCount = profileData.interests_count || 0;
        const subcategoriesCount = profileData.subcategories_count || 0;
        const dealbreakersCount = profileData.dealbreakers_count || 0;
        
        // Determine next route based on counts (same logic as OnboardingGuard)
        let nextRoute: string = '/interests';
        if (interestsCount === 0) {
          nextRoute = '/interests';
        } else if (subcategoriesCount === 0) {
          nextRoute = '/subcategories';
        } else if (dealbreakersCount === 0) {
          nextRoute = '/deal-breakers';
        } else {
          nextRoute = '/complete';
        }
        
        // Also check onboarding_step for more accurate routing
        const currentStep = profileData.onboarding_step;
        if (currentStep) {
          const stepMap: Record<string, string> = {
            interests: '/subcategories',
            subcategories: '/deal-breakers',
            'deal-breakers': '/complete',
            complete: '/complete',
          };
          if (stepMap[currentStep]) {
            nextRoute = stepMap[currentStep];
          }
        }
        
        // Completion requires all three: interests > 0, subcategories > 0, dealbreakers > 0
        // AND onboarding_complete flag must be true
        const isComplete = profileData.onboarding_complete === true && 
                          interestsCount > 0 && 
                          subcategoriesCount > 0 && 
                          dealbreakersCount > 0;
        
        onboardingState = {
          interestsCount,
          subcategoriesCount,
          dealbreakersCount,
          nextRoute: nextRoute as '/interests' | '/subcategories' | '/deal-breakers' | '/complete',
          isComplete
        };
        
        onboardingComplete = isComplete;
        
        console.log('Middleware: Onboarding state derived from profile', {
          interestsCount,
          subcategoriesCount,
          dealbreakersCount,
          nextRoute,
          isComplete,
          onboarding_step: currentStep,
          onboarding_complete: profileData.onboarding_complete,
          pathname: request.nextUrl.pathname
        });
      } else {
        // No profile found, default to requiring interests step
        onboardingState = {
          interestsCount: 0,
          subcategoriesCount: 0,
          dealbreakersCount: 0,
          nextRoute: '/interests' as const,
          isComplete: false
        };
      }
    } catch (error) {
      console.error('Middleware: Error deriving onboarding state:', error);
      // On error, default to requiring interests step
      onboardingState = {
        interestsCount: 0,
        subcategoriesCount: 0,
        dealbreakersCount: 0,
        nextRoute: '/interests' as const,
        isComplete: false
      };
    }
  }

  // CRITICAL: Block access to /home and other protected routes unless:
  // 1. Email is verified AND
  // 2. Onboarding is fully completed (derived from join tables)
  // Join tables are the SINGLE SOURCE OF TRUTH for completion
  if (isProtectedRoute && !isOnboardingRoute && user && user.email_confirmed_at) {
    // STRICT CHECK: Only allow access if onboarding is complete (derived from join tables)
    if (onboardingComplete && onboardingState?.isComplete) {
      console.log('Middleware: User has completed onboarding, allowing access to protected route');
      return response;
    }
    
    // Otherwise, redirect to the REQUIRED onboarding step (derived from join tables)
    const nextRoute = onboardingState?.nextRoute || '/interests';
    console.log('Middleware: User has not completed onboarding', {
      interestsCount: onboardingState?.interestsCount,
      subcategoriesCount: onboardingState?.subcategoriesCount,
      dealbreakersCount: onboardingState?.dealbreakersCount,
      isComplete: onboardingState?.isComplete,
      redirecting_to: nextRoute
    });
    const redirectUrl = new URL(nextRoute, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Allow access to onboarding routes
  // Users can navigate between onboarding steps, but completed users should go to home
  if (isOnboardingRoute && user && user.email_confirmed_at) {
    const currentPath = request.nextUrl.pathname;

    // CRITICAL: If onboarding is complete (derived from join tables), redirect to home (except /complete page for celebration)
    if (onboardingComplete && onboardingState?.isComplete) {
      // Allow /complete page for celebration, but redirect other onboarding routes to home
      if (currentPath !== '/complete') {
        console.log('Middleware: User completed onboarding, redirecting to home');
        const redirectUrl = new URL('/home', request.url);
        return NextResponse.redirect(redirectUrl);
      }
      // Allow /complete page even if already complete (for celebration)
      console.log('Middleware: Allowing access to /complete page (celebration)');
      return response;
    }

    // CRITICAL: Block /complete page unless onboarding is actually complete (derived from join tables)
    if (currentPath === '/complete' && !onboardingState?.isComplete) {
      const nextRoute = onboardingState?.nextRoute || '/interests';
      console.log('Middleware: Blocking access to /complete page - onboarding not complete', {
        interestsCount: onboardingState?.interestsCount,
        subcategoriesCount: onboardingState?.subcategoriesCount,
        dealbreakersCount: onboardingState?.dealbreakersCount,
        isComplete: onboardingState?.isComplete,
        redirecting_to: nextRoute
      });
      const redirectUrl = new URL(nextRoute, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // If user is on wrong onboarding step, redirect to correct one (derived from join tables)
    const nextRoute = onboardingState?.nextRoute || '/interests';
    if (currentPath !== nextRoute && currentPath !== '/complete') {
      console.log('Middleware: Redirecting to correct onboarding step', {
        currentPath,
        nextRoute,
        interestsCount: onboardingState?.interestsCount,
        subcategoriesCount: onboardingState?.subcategoriesCount,
        dealbreakersCount: onboardingState?.dealbreakersCount
      });
      const redirectUrl = new URL(nextRoute, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Allow access to correct onboarding step
    console.log('Middleware: Allowing access to onboarding route:', currentPath);
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

/* ORIGINAL AUTH MIDDLEWARE - COMMENTED OUT

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - require authentication
  const protectedRoutes = ['/home', '/profile', '/reviews', '/write-review', '/leaderboard'];
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Onboarding routes - require authentication
  const onboardingRoutes = ['/interests', '/subcategories'];
  const isOnboardingRoute = onboardingRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Auth routes - redirect to home if already logged in
  const authRoutes = ['/login', '/register', '/onboarding'];
  const isAuthRoute = authRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Redirect unauthenticated users from protected routes
  if ((isProtectedRoute || isOnboardingRoute) && !user) {
    const redirectUrl = new URL('/onboarding', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users from auth pages
  if (isAuthRoute && user) {
    // Check if onboarding is complete
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_step')
        .eq('user_id', user.id)
        .single();

      if (profile?.onboarding_step === 'complete') {
        return NextResponse.redirect(new URL('/home', request.url));
      } else {
        // Redirect to appropriate onboarding step
        const step = profile?.onboarding_step || 'interests';
        if (!request.nextUrl.pathname.startsWith(`/${step}`)) {
          return NextResponse.redirect(new URL(`/${step}`, request.url));
        }
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    }
  }

  return response;
}

END ORIGINAL AUTH MIDDLEWARE */

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
