import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value: '', ...options });
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
          .select('onboarding_step')
          .eq('user_id', user.id)
          .single();

        // Check callback type first
        const type = requestUrl.searchParams.get('type');

        // Handle password recovery
        if (type === 'recovery' || type === 'password_recovery') {
          console.log('Password recovery callback - redirecting to reset-password');
          const resetUrl = new URL('/reset-password', request.url);
          resetUrl.searchParams.set('verified', '1');
          return NextResponse.redirect(resetUrl);
        }

        // Handle email change confirmation
        if (type === 'email_change' || type === 'emailchange') {
          console.log('Email change callback - email change confirmed');
          // Redirect to profile page with success message
          const dest = new URL('/profile', request.url);
          dest.searchParams.set('email_changed', 'true');
          return NextResponse.redirect(dest);
        }

        // Check if this is an email verification callback
        if (type === 'signup') {
          console.log('Email verification callback - checking verification status');
          
          // Check if email is actually verified now
          if (user.email_confirmed_at) {
            console.log('Email verified - redirecting to interests');
            // Email is verified, proceed directly to interests
            const dest = new URL('/interests', request.url);
            dest.searchParams.set('verified', '1'); // one-time signal
            dest.searchParams.set('email_verified', 'true'); // additional flag for client-side
            return NextResponse.redirect(dest);
          } else {
            console.log('Email not yet verified - redirecting to verify-email');
            // Email not verified, redirect to verify-email page
            return NextResponse.redirect(new URL('/verify-email', request.url));
          }
        }

        // Redirect based on onboarding status and email verification
        if (profile?.onboarding_step === 'complete') {
          return NextResponse.redirect(new URL('/home', request.url));
        } else {
          // OAuth or other auth flow - check if email is verified
          if (user.email_confirmed_at) {
            // Email is verified, proceed to interests with verification flag
            const dest = new URL('/interests', request.url);
            dest.searchParams.set('verified', '1'); // one-time signal
            return NextResponse.redirect(dest);
          } else {
            // Email not verified, redirect to verify-email page
            return NextResponse.redirect(new URL('/verify-email', request.url));
          }
        }
      }

      return NextResponse.redirect(new URL(next, request.url));
    }

    console.error('Code exchange error:', exchangeError);
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url));
}
