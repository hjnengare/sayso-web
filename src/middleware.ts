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

  // Check if user has completed onboarding and redirect from onboarding routes
  // BUT allow access to /complete page (the celebration page)
  if (isOnboardingRoute && user && request.nextUrl.pathname !== '/complete') {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_step')
        .eq('user_id', user.id)
        .single();

      if (profile?.onboarding_step === 'complete') {
        console.log('Middleware: User completed onboarding, redirecting from onboarding route to home');
        const redirectUrl = new URL('/home', request.url);
        return NextResponse.redirect(redirectUrl);
      }
    } catch (error) {
      console.error('Middleware: Error checking onboarding status:', error);
      // Continue with normal flow if check fails
    }
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
