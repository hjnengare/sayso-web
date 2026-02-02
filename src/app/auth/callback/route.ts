import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function isSchemaCacheError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('schema cache') && message.includes('onboarding_completed_at');
}

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

  // Legacy hash fragment (e.g. email confirmation in different browser/device): tokens are in #access_token=...&refresh_token=...
  // Server never sees the hash, so return HTML that sets session client-side then redirects.
  // CROSS-DEVICE FIX: On different devices, we need to properly set up the session from the tokens.
  const typeFromQuery = requestUrl.searchParams.get('type');
  const nextFromQuery = requestUrl.searchParams.get('next') ?? '/';
  if (!code && !token) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Verifying your email...</title>
  <style>
    body {
      font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #E5E0E5;
      color: #2D2D2D;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 400px;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(125, 155, 118, 0.2);
      border-top-color: #7D9B76;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1.5rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
    p { font-size: 1rem; color: #666; margin: 0; }
    .error { color: #722F37; margin-top: 1rem; display: none; }
    .error.show { display: block; }
    .retry-btn {
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: #7D9B76;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      display: none;
    }
    .retry-btn.show { display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner" id="spinner"></div>
    <h1 id="title">Verifying your email...</h1>
    <p id="message">Please wait while we confirm your account.</p>
    <p class="error" id="error"></p>
    <button class="retry-btn" id="retry" onclick="window.location.reload()">Try Again</button>
  </div>
  <script>
    (function() {
      var SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
      var SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};
      var REDIRECT_TYPE = ${JSON.stringify(typeFromQuery || '')};
      var NEXT = ${JSON.stringify(nextFromQuery)};
      
      function showError(msg) {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('title').textContent = 'Verification Issue';
        document.getElementById('message').textContent = 'We encountered a problem verifying your email.';
        document.getElementById('error').textContent = msg;
        document.getElementById('error').classList.add('show');
        document.getElementById('retry').classList.add('show');
      }
      
      function redirect(type) {
        // Small delay to ensure cookies are set
        setTimeout(function() {
          if (type === 'recovery' || type === 'password_recovery') {
            window.location.replace('/reset-password?verified=1');
          } else if (type === 'email_change' || type === 'emailchange') {
            window.location.replace('/profile?email_changed=true');
          } else {
            // For email verification, redirect to verify-email which will handle routing
            window.location.replace('/verify-email?verified=1');
          }
        }, 300);
      }
      
      // Parse hash fragment
      var hash = window.location.hash && window.location.hash.substring(1);
      if (!hash) {
        // No hash - check if this is a direct page load without tokens
        // Redirect to login page
        console.log('No hash fragment found');
        window.location.replace('/login?message=Please+check+your+email+for+the+verification+link');
        return;
      }
      
      var params = new URLSearchParams(hash);
      var access_token = params.get('access_token');
      var refresh_token = params.get('refresh_token');
      var error_param = params.get('error');
      var error_description = params.get('error_description');
      
      // Handle error in hash (e.g., expired link)
      if (error_param) {
        console.error('Auth error in hash:', error_param, error_description);
        if (error_description && error_description.includes('expired')) {
          showError('This verification link has expired. Please request a new one.');
        } else {
          showError(error_description || error_param || 'Verification failed');
        }
        return;
      }
      
      if (!access_token || !refresh_token) {
        console.error('Missing tokens in hash');
        showError('Invalid verification link. Please try clicking the link again or request a new one.');
        return;
      }
      
      // Load Supabase and set session
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      script.async = false;
      script.onload = function() {
        var supabase = window.supabase;
        var client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false // We're handling it manually
          }
        });
        
        // Set the session from the tokens
        client.auth.setSession({ 
          access_token: access_token, 
          refresh_token: refresh_token 
        })
        .then(function(result) {
          if (result.error) {
            console.error('Session set error:', result.error);
            // Even if session set fails on different device, the email IS verified
            // Just redirect and let the user log in
            if (result.error.message && result.error.message.includes('expired')) {
              showError('This link has expired. Your email may already be verified - try logging in.');
            } else {
              // Redirect anyway - email verification happened server-side
              console.log('Session error but redirecting - email should be verified');
              redirect(REDIRECT_TYPE);
            }
            return;
          }
          
          console.log('Session set successfully');
          redirect(REDIRECT_TYPE);
        })
        .catch(function(err) {
          console.error('Hash session set error:', err);
          // Still try to redirect - the email verification itself may have worked
          // The user can log in on this device afterward
          showError('Session setup failed. Your email may be verified - try logging in.');
        });
      };
      script.onerror = function() {
        console.error('Failed to load Supabase script');
        showError('Failed to load verification scripts. Please check your internet connection and try again.');
      };
      document.head.appendChild(script);
    })();
  </script>
</body>
</html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
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
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_step, onboarding_complete, onboarding_completed_at, interests_count, subcategories_count, dealbreakers_count, role, account_role')
          .eq('user_id', user.id)
          .single();

        if (profileError && isSchemaCacheError(profileError)) {
          ({ data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_step, onboarding_complete, interests_count, subcategories_count, dealbreakers_count, role, account_role')
            .eq('user_id', user.id)
            .single());
        }

        if (profileError) {
          console.warn('[Auth Callback] Error fetching profile:', profileError);
        }

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
            // Update profile to mark email as verified
            try {
              const { error: verifyError } = await supabase
                .from('profiles')
                .update({
                  email_verified: true,
                  email_verified_at: user.email_confirmed_at,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

              if (verifyError) {
                console.error('Failed to update email verification status:', verifyError);
              } else {
                console.log('Successfully updated email verification status');
              }
            } catch (verifyErr) {
              console.error('Error updating email verification:', verifyErr);
            }

            // CRITICAL: Check user's role to determine redirect destination
            // Priority: user_metadata.account_type (source of truth from registration) > profile role
            // Never send business users to user onboarding (/interests); when role unknown, send to /verify-email so middleware can decide
            const userMetadataAccountType = user.user_metadata?.account_type as string | undefined;
            const profileRole = profile?.role || profile?.account_role;

            let userRole: string | null = null;
            if (userMetadataAccountType === 'business_owner') {
              userRole = 'business_owner';
            } else if (userMetadataAccountType === 'user') {
              userRole = 'user';
            } else if (profileRole === 'business_owner') {
              userRole = 'business_owner';
            } else if (profileRole === 'user') {
              userRole = 'user';
            }
            // When role unknown (no metadata, profile missing or role not set), do NOT assume 'user' — send to /verify-email so middleware can fetch and redirect

            console.log('Email verified - determining redirect:', {
              profileRole: profile?.role,
              account_role: profile?.account_role,
              metadataAccountType: userMetadataAccountType,
              resolvedRole: userRole
            });

            // Sync profile role with user metadata if they don't match (set during registration)
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
            }
            if (userRole === 'user') {
              console.log('Email verified - personal user, redirecting to interests onboarding');
              const dest = new URL('/interests', request.url);
              dest.searchParams.set('verified', '1');
              dest.searchParams.set('email_verified', 'true');
              const redirectResponse = NextResponse.redirect(dest);
              response.cookies.getAll().forEach(cookie => {
                redirectResponse.cookies.set(cookie);
              });
              return redirectResponse;
            }
            // Role unknown (e.g. profile not yet created or role not set) — send to /verify-email so middleware can fetch status and redirect (avoids sending business to /interests)
            console.log('Email verified - role unknown, redirecting to /verify-email for middleware to decide');
            const verifyDest = new URL('/verify-email', request.url);
            verifyDest.searchParams.set('verified', '1');
            const redirectResponse = NextResponse.redirect(verifyDest);
            response.cookies.getAll().forEach(cookie => {
              redirectResponse.cookies.set(cookie);
            });
            return redirectResponse;
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
          const userRole = profile?.role || profile?.account_role;
          const isOnboardingComplete = !!profile?.onboarding_completed_at;

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
          if (isOnboardingComplete) {
            // User has completed onboarding, redirect based on role
            console.log('[Auth Callback] User completed onboarding, redirecting based on role:', userRole);
            const destination = userRole === 'business_owner' ? '/claim-business' : '/complete';
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

              console.log('[Auth Callback] Redirecting to onboarding start:', {
                onboarding_complete: profile?.onboarding_complete,
                onboarding_completed_at: profile?.onboarding_completed_at
              });

              const dest = new URL('/interests', request.url);
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

