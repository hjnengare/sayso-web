/**
 * Middleware V2 - Onboarding Enforcement
 *
 * Greenfield implementation with strict backend-driven routing.
 * Enforces onboarding step access based on database state only.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ONBOARDING_ROUTES = ['/interests', '/subcategories', '/deal-breakers', '/complete'];
const PUBLIC_ROUTES = ['/login', '/register', '/onboarding', '/verify-email', '/auth/callback'];

function isSchemaCacheError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('schema cache') && message.includes('onboarding_completed_at');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes - allow without auth
  if (PUBLIC_ROUTES.includes(pathname)) {
    return response;
  }

  // No user - redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Check email verification
  if (!user.email_confirmed_at) {
    const url = request.nextUrl.clone();
    url.pathname = '/verify-email';
    return NextResponse.redirect(url);
  }

  // Fetch onboarding state from database
  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_step, onboarding_complete, onboarding_completed_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError && isSchemaCacheError(profileError)) {
    ({ data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_step, onboarding_complete')
      .eq('user_id', user.id)
      .maybeSingle());
  }

  if (!profile) {
    // Profile doesn't exist - redirect to interests to create it
    if (!ONBOARDING_ROUTES.includes(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/interests';
      return NextResponse.redirect(url);
    }
    return response;
  }

  const { onboarding_step, onboarding_complete, onboarding_completed_at } = profile;
  const isComplete = !!onboarding_completed_at;

  // RULE 1: If onboarding complete, redirect onboarding routes to /home
  if (isComplete) {
    if (ONBOARDING_ROUTES.includes(pathname)) {
      // Allow /complete for celebration, redirect others
      if (pathname !== '/complete') {
        const url = request.nextUrl.clone();
        url.pathname = '/complete';
        return NextResponse.redirect(url);
      }
    }
    return response;
  }

  // If incomplete, /complete should redirect to /onboarding
  if (pathname === '/complete') {
    const url = request.nextUrl.clone();
    url.pathname = '/onboarding';
    return NextResponse.redirect(url);
  }

  // RULE 2: If accessing onboarding route, enforce step order
  if (ONBOARDING_ROUTES.includes(pathname)) {
    const stepOrder = ['interests', 'subcategories', 'deal-breakers', 'complete'];
    const currentStepIndex = stepOrder.indexOf(onboarding_step);
    const requestedStep = pathname.slice(1); // Remove leading '/'
    const requestedStepIndex = stepOrder.indexOf(requestedStep);

    // Can access current step or earlier steps
    if (requestedStepIndex <= currentStepIndex) {
      return response;
    }

    // Trying to skip ahead - redirect to current step
    const stepRoutes: Record<string, string> = {
      interests: '/interests',
      subcategories: '/subcategories',
      'deal-breakers': '/deal-breakers',
      complete: '/complete',
    };

    const url = request.nextUrl.clone();
    url.pathname = stepRoutes[onboarding_step] || '/interests';
    return NextResponse.redirect(url);
  }

  // RULE 3: If accessing protected route but onboarding incomplete, redirect to /interests
  const url = request.nextUrl.clone();
  url.pathname = '/interests';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
