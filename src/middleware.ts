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

  // Helper function to determine next incomplete onboarding step
  // PRIMARY SOURCE OF TRUTH: onboarding_step field
  // Falls back to counts only if onboarding_step is missing/invalid
  const getNextOnboardingStep = (profile: any): string => {
    // If no profile, user needs to start at interests
    if (!profile) {
      return 'interests';
    }

    // PRIMARY: Check onboarding_step field first (this is what APIs update)
    const currentStep = profile.onboarding_step;
    
    // If onboarding is marked complete, user is done
    if (profile.onboarding_complete && currentStep === 'complete') {
      return 'complete';
    }

    // Map onboarding_step to next step
    // If step is 'interests', next is 'subcategories'
    // If step is 'subcategories', next is 'deal-breakers'
    // If step is 'deal-breakers', next is 'complete'
    if (currentStep) {
      const stepMap: { [key: string]: string } = {
        'interests': 'subcategories',
        'subcategories': 'deal-breakers',
        'deal-breakers': 'complete',
        'complete': 'complete'
      };
      
      // If we have a valid step, return the next step
      if (stepMap[currentStep]) {
        return stepMap[currentStep];
      }
    }

    // FALLBACK: Only use counts if onboarding_step is missing or invalid
    // This handles edge cases where step wasn't set but data exists
    const interestsCount = profile.interests_count || 0;
    const subcategoriesCount = profile.subcategories_count || 0;
    const dealbreakersCount = profile.dealbreakers_count || 0;

    if (interestsCount === 0) {
      return 'interests';
    } else if (subcategoriesCount === 0) {
      return 'subcategories';
    } else if (dealbreakersCount === 0) {
      return 'deal-breakers';
    } else {
      return 'complete';
    }
  };

  // Lightweight profile check - only fetch essential fields
  // Don't join large tables or compute aggregations
  let profile = null;
  if (user) {
    try {
      // Only fetch minimal fields needed for routing decisions
      // Lightweight check - no joins, no aggregations
      // CRITICAL: Add timestamp to bust cache in production (Vercel Edge caching)
      // Use .maybeSingle() to handle missing profiles gracefully
      const cacheBuster = Date.now();
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_step, onboarding_complete, interests_count, subcategories_count, dealbreakers_count')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!profileError && profileData) {
        profile = profileData;
        console.log('Middleware: Profile fetched', {
          onboarding_step: profile.onboarding_step,
          onboarding_complete: profile.onboarding_complete,
          interests_count: profile.interests_count,
          subcategories_count: profile.subcategories_count,
          dealbreakers_count: profile.dealbreakers_count,
          cacheBuster
        });
      } else {
        console.warn('Middleware: Profile not found or error fetching profile:', {
          error: profileError?.message,
          code: profileError?.code,
          cacheBuster
        });
        // Profile might not exist yet - allow access to interests page
        profile = null;
      }
    } catch (error) {
      console.error('Middleware: Error fetching profile:', error);
      profile = null;
    }
  }

  // CRITICAL: Block access to /home and other protected routes unless:
  // 1. Email is verified AND
  // 2. Onboarding is fully completed AND
  // 3. User has visited the /complete page (onboarding_step === 'complete')
  // Only check this for /home, not for onboarding routes
  if (isProtectedRoute && !isOnboardingRoute && user && user.email_confirmed_at) {
    // Check if onboarding is complete
    if (profile?.onboarding_complete) {
      // CRITICAL: Even if onboarding_complete is true, user MUST visit /complete page first
      // The cookie is set when the /complete page loads, ensuring users see the celebration
      const hasVisitedCompleteCookie = request.cookies.get('onboarding_complete_visited')?.value === 'true';
      
      // If onboarding is complete but cookie is not set, user hasn't visited /complete page yet
      // Redirect them to /complete to see the celebration before accessing /home
      if (!hasVisitedCompleteCookie) {
        console.log('Middleware: Onboarding complete but user has not visited /complete page, redirecting to /complete');
        const redirectUrl = new URL('/complete', request.url);
        return NextResponse.redirect(redirectUrl);
      }
      
      // User has completed onboarding AND visited complete page (cookie exists), allow access to home
      // User has completed onboarding AND visited complete page, allow access to home
      return response;
    }
    
    // Otherwise, determine next step and redirect
    const nextStep = getNextOnboardingStep(profile);
    console.log('Middleware: User has not completed onboarding, redirecting to next step:', nextStep);
    const redirectUrl = new URL(`/${nextStep}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Allow access to onboarding routes - no step skipping prevention
  // Users can navigate freely between onboarding steps
  if (isOnboardingRoute && user && user.email_confirmed_at) {
    const currentPath = request.nextUrl.pathname;

    // CRITICAL: Always allow access to /complete page - users should see the celebration page
    // This must be checked BEFORE the "redirect if completed" check
    // Allow even if onboarding_complete is true (user can revisit celebration page)
    if (currentPath === '/complete') {
      console.log('Middleware: Allowing access to /complete page');
      // Allow access to complete page - prerequisites are checked in OnboardingGuard
      return response;
    }

    // If user has completed onboarding, redirect other onboarding routes to home
    // But we already allowed /complete above, so this only affects other onboarding routes
    if (profile?.onboarding_complete) {
      console.log('Middleware: User completed onboarding, redirecting to home');
      const redirectUrl = new URL('/home', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Allow access to any onboarding step - no skipping prevention
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
