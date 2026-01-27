import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token = requestUrl.searchParams.get('token') || requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
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

  if (code || token) {
    // Create response first so we can set cookies on it
    let response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
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

    const { error: exchangeError } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token: token as string,
          type: (type || 'signup') as any,
          email: requestUrl.searchParams.get('email') || undefined,
        });

    if (!exchangeError) {
      // Check if profile exists and get onboarding status
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_step, onboarding_complete, interests_count, subcategories_count, dealbreakers_count, role, account_role')
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
            // CRITICAL: Check user's role to determine redirect destination
            // Priority: user_metadata.account_type (source of truth from registration) > profile role > 'user'
            // The user metadata is explicitly set during registration and should be trusted
            // The profile trigger may create a default 'user' role which we should NOT prioritize
            const userMetadataAccountType = user.user_metadata?.account_type as string | undefined;

            // If user metadata explicitly says business_owner, trust it (set during registration)
            // Only fall back to profile if metadata doesn't have account_type
            let userRole: string;
            if (userMetadataAccountType === 'business_owner') {
              userRole = 'business_owner';
            } else if (userMetadataAccountType === 'user') {
              userRole = 'user';
            } else {
              // No metadata, fall back to profile
              userRole = profile?.role || profile?.account_role || 'user';
            }

            console.log('Email verified - determining redirect:', {
              profileRole: profile?.role,
              currentRole: profile?.account_role,
              metadataAccountType: userMetadataAccountType,
              resolvedRole: userRole
            });

            // CRITICAL: Sync profile role with user metadata if they don't match
            // The database trigger may have created the profile with default 'user' role
            // We need to update it to match the actual registration intent
            if (userMetadataAccountType && profile && profile.role !== userMetadataAccountType) {
              console.log('Profile role mismatch - syncing profile with metadata:', {
                currentProfileRole: profile.role,
                metadataAccountType: userMetadataAccountType
              });

              try {
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({
                    role: userMetadataAccountType,
                    account_role: userMetadataAccountType,
                    updated_at: new Date().toISOString()
                  })
                  .eq('user_id', user.id);

                if (updateError) {
                  console.error('Failed to sync profile role:', updateError);
                } else {
                  console.log('Successfully synced profile role to:', userMetadataAccountType);
                }
              } catch (syncError) {
                console.error('Error syncing profile role:', syncError);
              }
            }

            if (userRole === 'business_owner') {
              console.log('Email verified - business owner, redirecting to /my-businesses');
              const dest = new URL('/my-businesses', request.url);
              const redirectResponse = NextResponse.redirect(dest);
              response.cookies.getAll().forEach(cookie => {
                redirectResponse.cookies.set(cookie);
              });
              return redirectResponse;
            } else {
              console.log('Email verified - personal user, redirecting to interests onboarding');
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
          const userRole = profile.role || profile.account_role;

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

