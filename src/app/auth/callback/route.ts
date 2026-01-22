import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    
    // Handle specific OAuth errors
    if (error === 'access_denied') {
      return NextResponse.redirect(
        new URL('/auth/auth-code-error?error=Access denied. Please try again.', request.url)
      );
    } else if (error === 'invalid_request') {
      return NextResponse.redirect(
        new URL('/auth/auth-code-error?error=Invalid request. Please try again.', request.url)
      );
    }
    
    return NextResponse.redirect(
      new URL(`/auth/auth-code-error?error=${encodeURIComponent(error_description || error)}`, request.url)
    );
  }

  if (code) {
    // Create response first so we can set cookies on it
    let response = NextResponse.next();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            // Read from request cookies first (browser-sent cookies)
            const requestCookie = request.headers.get('cookie');
            if (requestCookie) {
              const cookieMap = requestCookie.split(';').reduce((acc, cookie) => {
                const [key, value] = cookie.trim().split('=');
                if (key && value) acc[key] = decodeURIComponent(value);
                return acc;
              }, {} as Record<string, string>);
              if (cookieMap[name]) return cookieMap[name];
            }
            // Fallback: try to get from cookieStore (server-set cookies)
            // Note: cookies() is async, but get() is sync, so we can't await here
            // This is okay because request cookies should have the session
            return undefined;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            // Set cookie with proper flags for security
            response.cookies.set(name, value, {
              ...options,
              httpOnly: (options?.httpOnly as boolean | undefined) ?? true,
              secure: (options?.secure as boolean | undefined) ?? process.env.NODE_ENV === 'production',
              sameSite: (options?.sameSite as 'lax' | 'strict' | 'none' | undefined) ?? 'lax',
              path: (options?.path as string | undefined) ?? '/',
            });
          },
          remove(name: string, options: Record<string, unknown>) {
            response.cookies.set(name, '', {
              ...options,
              httpOnly: (options?.httpOnly as boolean | undefined) ?? true,
              secure: (options?.secure as boolean | undefined) ?? process.env.NODE_ENV === 'production',
              sameSite: (options?.sameSite as 'lax' | 'strict' | 'none' | undefined) ?? 'lax',
              path: (options?.path as string | undefined) ?? '/',
              maxAge: 0,
            });
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // Check if profile exists and get onboarding status
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_step, onboarding_complete, interests_count, subcategories_count, dealbreakers_count, role, current_role')
          .eq('user_id', user.id)
          .single();

        // Check callback type first
        const type = requestUrl.searchParams.get('type');

        // Handle password recovery
        if (type === 'recovery' || type === 'password_recovery') {
          console.log('Password recovery callback - redirecting to reset-password');
          const resetUrl = new URL('/reset-password', request.url);
          resetUrl.searchParams.set('verified', '1');
          // Copy cookies to redirect response
          const redirectResponse = NextResponse.redirect(resetUrl);
          response.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie);
          });
          return redirectResponse;
        }

        // Handle email change confirmation
        if (type === 'email_change' || type === 'emailchange') {
          console.log('Email change callback - email change confirmed');
          // Redirect to profile page with success message
          const dest = new URL('/profile', request.url);
          dest.searchParams.set('email_changed', 'true');
          // Copy cookies to redirect response
          const redirectResponse = NextResponse.redirect(dest);
          response.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie);
          });
          return redirectResponse;
        }

        // Check if this is an email verification callback
        if (type === 'signup') {
          console.log('Email verification callback - checking verification status');
          
          // Check if email is actually verified now
          if (user.email_confirmed_at) {
            // Check user's role to determine redirect destination
            const userRole = profile?.role || profile?.current_role || 'user';
            
            if (userRole === 'business_owner') {
              console.log('Email verified - business owner, redirecting to /claim-business');
              const dest = new URL('/claim-business', request.url);
              const redirectResponse = NextResponse.redirect(dest);
              response.cookies.getAll().forEach(cookie => {
                redirectResponse.cookies.set(cookie);
              });
              return redirectResponse;
            } else {
              console.log('Email verified - redirecting to interests');
              // Email is verified, proceed directly to interests
              const dest = new URL('/interests', request.url);
              dest.searchParams.set('verified', '1'); // one-time signal
              dest.searchParams.set('email_verified', 'true'); // additional flag for client-side
              // Copy cookies to redirect response
              const redirectResponse = NextResponse.redirect(dest);
              response.cookies.getAll().forEach(cookie => {
                redirectResponse.cookies.set(cookie);
              });
              return redirectResponse;
            }
          } else {
            console.log('Email not yet verified - redirecting to verify-email');
            // Email not verified, redirect to verify-email page
            const redirectResponse = NextResponse.redirect(new URL('/verify-email', request.url));
            response.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie);
            });
            return redirectResponse;
          }
        }

        // Handle Google OAuth and other auth flows
        // Check if this is a new user (first-time Google sign-in)
        const isNewUser = !profile;
        
        if (isNewUser) {
          // New user from Google OAuth - Check if email is tied to business ownership
          console.log('Google OAuth: New user detected, checking for business email tie-in');
          
          // Wait a bit for trigger to potentially create profile
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if this email has any business owners linked to it
          // (In case they registered a business under this email)
          const { data: businessOwners } = await supabase
            .from('business_owners')
            .select('business_id')
            .eq('user_id', user.id)
            .limit(1);
          
          // Also check business_ownership_requests for approved claims
          const { data: ownershipRequests } = await supabase
            .from('business_ownership_requests')
            .select('business_id, status')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .limit(1);

          const hasBusinessOwnership = (businessOwners && businessOwners.length > 0) || 
                                       (ownershipRequests && ownershipRequests.length > 0);

          if (hasBusinessOwnership) {
            // Email is tied to business ownership - redirect to role selection gate
            console.log('OAuth Email has business ownership tie-in, redirecting to role selection');
            const dest = new URL('/onboarding/select-account-type', request.url);
            dest.searchParams.set('oauth', 'true');
            dest.searchParams.set('business_tied', 'true');
            const redirectResponse = NextResponse.redirect(dest);
            response.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie);
            });
            return redirectResponse;
          }

          // New user from Google OAuth - profile should be created by trigger with 'user' role
          // OAuth users get Personal accounts by default
          console.log('Google OAuth: New user detected with no business tie-in, redirecting to interests for personal onboarding');
          
          if (user.email_confirmed_at) {
            // Email is verified (Google emails are auto-verified), redirect to interests for personal onboarding
            const dest = new URL('/interests', request.url);
            dest.searchParams.set('verified', '1');
            dest.searchParams.set('email_verified', 'true');
            // Copy cookies to redirect response
            const redirectResponse = NextResponse.redirect(dest);
            response.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie);
            });
            return redirectResponse;
          } else {
            // Email not verified, redirect to verify-email
            const redirectResponse = NextResponse.redirect(new URL('/verify-email', request.url));
            response.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie);
            });
            return redirectResponse;
          }
        } else {
          // Existing user - check if business owner for proper redirect
          const userRole = profile.role || profile.current_role;

          // OAuth guard: If email already owns a business, require explicit role selection
          if (type === 'oauth' && (userRole === 'business_owner' || profile.role === 'both')) {
            const dest = new URL('/onboarding/select-account-type', request.url);
            dest.searchParams.set('mode', 'oauth');
            dest.searchParams.set('existingRole', 'business_owner');
            if (user.email) {
              dest.searchParams.set('email', user.email);
            }

            const redirectResponse = NextResponse.redirect(dest);
            response.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie);
            });
            return redirectResponse;
          }
          // Existing user - check onboarding status
          // STRICT: Use onboarding_step as single source of truth
          if (profile.onboarding_complete === true) {
            // User has completed onboarding, redirect based on role
            console.log('[Auth Callback] User completed onboarding, redirecting based on role:', userRole);
            const destination = userRole === 'business_owner' ? '/claim-business' : '/home';
            const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
            response.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie);
            });
            return redirectResponse;
          } else {
            // User exists but onboarding incomplete - redirect to required step
            if (user.email_confirmed_at) {
              // Business owners skip personal onboarding and go to claim-business
              if (userRole === 'business_owner') {
                console.log('[Auth Callback] Business owner, redirecting to /claim-business');
                const redirectResponse = NextResponse.redirect(new URL('/claim-business', request.url));
                response.cookies.getAll().forEach(cookie => {
                  redirectResponse.cookies.set(cookie);
                });
                return redirectResponse;
              }
              
              // Use onboarding_step to determine required route (default: 'interests')
              const requiredStep = profile.onboarding_step || 'interests';
              const stepToRoute: Record<string, string> = {
                'interests': '/interests',
                'subcategories': '/subcategories',
                'deal-breakers': '/deal-breakers',
                'complete': '/complete',
              };
              
              const requiredRoute = stepToRoute[requiredStep] || '/interests';
              console.log('[Auth Callback] Redirecting to required onboarding step:', {
                onboarding_step: requiredStep,
                requiredRoute,
                onboarding_complete: profile.onboarding_complete
              });
              
              const dest = new URL(requiredRoute, request.url);
              if (requiredRoute === '/interests') {
                dest.searchParams.set('verified', '1');
              }
              // Copy cookies to redirect response
              const redirectResponse = NextResponse.redirect(dest);
              response.cookies.getAll().forEach(cookie => {
                redirectResponse.cookies.set(cookie);
              });
              return redirectResponse;
            } else {
              // Email not verified, redirect to verify-email
              const redirectResponse = NextResponse.redirect(new URL('/verify-email', request.url));
              response.cookies.getAll().forEach(cookie => {
                redirectResponse.cookies.set(cookie);
              });
              return redirectResponse;
            }
          }
        }
      }

      // Default redirect with cookies
      const redirectResponse = NextResponse.redirect(new URL(next, request.url));
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }

    console.error('Code exchange error:', exchangeError);
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url));
}
