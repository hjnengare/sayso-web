import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType, User } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

function isSchemaCacheError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('schema cache') && message.includes('onboarding_completed_at');
}

function isExpiredTokenError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('expired') ||
    lower.includes('email link is invalid') ||
    lower.includes('otp has expired') ||
    lower.includes('token has expired') ||
    lower.includes('link is invalid or has expired') ||
    lower.includes('otp_expired')
  );
}

function isPKCEMismatchError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('code challenge') ||
    lower.includes('code verifier') ||
    lower.includes('pkce')
  );
}

type ProfileRow = {
  role: string | null;
  account_role: string | null;
  onboarding_completed_at?: string | null;
};

type NormalizedRole = 'admin' | 'business_owner' | 'user';

function normalizeRole(value: string | null | undefined): NormalizedRole | null {
  const role = String(value || '').toLowerCase().trim();
  if (!role) return null;

  if (role === 'admin' || role === 'super_admin' || role === 'superadmin') {
    return 'admin';
  }

  if (role === 'business_owner' || role === 'business' || role === 'owner') {
    return 'business_owner';
  }

  if (role === 'user' || role === 'personal') {
    return 'user';
  }

  return null;
}

function resolveRole(user: User, profile: ProfileRow | null): NormalizedRole {
  const candidates = [
    profile?.account_role,
    profile?.role,
    user?.user_metadata?.account_type,
    user?.user_metadata?.role,
    user?.app_metadata?.role,
  ];

  for (const candidate of candidates) {
    const resolved = normalizeRole(candidate);
    if (resolved) return resolved;
  }

  return 'user';
}

function resolveDestination(role: NormalizedRole, profile: ProfileRow | null): string {
  if (role === 'admin') return '/admin';
  if (role === 'business_owner') return '/my-businesses';

  const onboardingComplete = Boolean(profile?.onboarding_completed_at);
  return onboardingComplete ? '/home' : '/interests';
}

async function loadProfile(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<ProfileRow | null> {
  let { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role, account_role, onboarding_completed_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError && isSchemaCacheError(profileError)) {
    ({ data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role, account_role')
      .eq('user_id', userId)
      .maybeSingle());
  }

  if (profileError) {
    console.warn('[Auth Callback] Failed to fetch profile:', profileError.message);
    return null;
  }

  if (!profileData) return null;

  return {
    role: profileData.role ?? null,
    account_role: profileData.account_role ?? null,
    onboarding_completed_at:
      'onboarding_completed_at' in profileData
        ? (profileData.onboarding_completed_at as string | null)
        : null,
  };
}

async function ensureProfileAndRole(
  supabase: ReturnType<typeof createServerClient>,
  user: User
): Promise<ProfileRow | null> {
  const metadataRole =
    normalizeRole(user.user_metadata?.account_type) ??
    normalizeRole(user.user_metadata?.role) ??
    normalizeRole(user.app_metadata?.role);

  let profile = await loadProfile(supabase, user.id);

  // CRITICAL: Profile race condition fix.
  // If profile doesn't exist, the database trigger (handle_new_user) may still be running.
  // Retry a few times before attempting to create manually.
  if (!profile) {
    // Wait briefly and retry - trigger may still be executing
    for (let attempt = 0; attempt < 3 && !profile; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
      profile = await loadProfile(supabase, user.id);
    }
  }

  if (!profile) {
    // Trigger didn't create profile - create it manually
    const insertRole = metadataRole ?? 'user';
    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      role: insertRole,
      account_role: insertRole,
      updated_at: new Date().toISOString(),
    };

    if (insertRole === 'business_owner') {
      insertPayload.onboarding_step = 'business_setup';
    }

    console.log('[Auth Callback] Creating missing profile for user:', user.id);

    const { error: insertError } = await supabase
      .from('profiles')
      .upsert(insertPayload, { onConflict: 'user_id' });

    if (insertError) {
      console.warn('[Auth Callback] Failed to create profile:', insertError.message);
      return null;
    }

    profile = await loadProfile(supabase, user.id);
  }

  if (profile && metadataRole) {
    const roleNeedsSync =
      normalizeRole(profile.role) !== metadataRole ||
      normalizeRole(profile.account_role) !== metadataRole;

    if (roleNeedsSync) {
      const updates: Record<string, unknown> = {
        role: metadataRole,
        account_role: metadataRole,
        updated_at: new Date().toISOString(),
      };

      if (metadataRole === 'business_owner') {
        updates.onboarding_step = 'business_setup';
      }

      console.log('[Auth Callback] Syncing profile role:', { userId: user.id, from: profile.role, to: metadataRole });

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (updateError) {
        console.warn('[Auth Callback] Failed to sync profile role:', updateError.message);
      } else {
        profile = await loadProfile(supabase, user.id);
      }
    }
  }

  return profile;
}

function applyAuthCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  return target;
}

function redirectTo(
  request: NextRequest,
  sourceResponse: NextResponse,
  pathname: string,
  params?: Record<string, string>
): NextResponse {
  const url = new URL(pathname, request.url);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const redirectResponse = NextResponse.redirect(url);
  return applyAuthCookies(sourceResponse, redirectResponse);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token = requestUrl.searchParams.get('token') || requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error) {
    const combinedError = `${error} ${errorDescription || ''}`.trim();
    if (isExpiredTokenError(combinedError)) {
      return NextResponse.redirect(new URL('/verify-email?expired=1', request.url));
    }

    if (isPKCEMismatchError(combinedError)) {
      console.log('[Auth Callback] PKCE mismatch from query params — redirecting to login');
      return NextResponse.redirect(
        new URL('/login?message=' + encodeURIComponent('Email verified successfully! Please sign in.'), request.url)
      );
    }

    return NextResponse.redirect(
      new URL(`/auth/auth-code-error?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

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

  let exchangeError: { message?: string } | null = null;

  if (code) {
    const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
    exchangeError = codeError;
  } else if (token) {
    // Backward-compatible fallback for legacy links that contain token/token_hash.
    const { error: otpError } = await supabase.auth.verifyOtp({
      token,
      type: (type || 'signup') as EmailOtpType,
      email: requestUrl.searchParams.get('email') || undefined,
    });
    exchangeError = otpError;
  } else {
    exchangeError = { message: 'Missing code in auth callback.' };
  }

  if (exchangeError) {
    const message = exchangeError.message || 'Authentication callback failed.';

    if (isExpiredTokenError(message)) {
      return redirectTo(request, response, '/verify-email', { expired: '1' });
    }

    // Cross-browser/device verification: PKCE code verifier only exists in
    // the original browser. The email IS confirmed server-side, so redirect
    // the user to login with a success message instead of showing an error.
    if (isPKCEMismatchError(message)) {
      console.log('[Auth Callback] PKCE mismatch (cross-browser verification) — redirecting to login');
      return redirectTo(request, response, '/login', {
        message: 'Email verified successfully! Please sign in.',
      });
    }

    return redirectTo(request, response, '/auth/auth-code-error', {
      error: message,
    });
  }

  // Preserve non-signup callback behavior.
  if (type === 'recovery' || type === 'password_recovery') {
    return redirectTo(request, response, '/reset-password', { verified: '1' });
  }

  if (type === 'email_change' || type === 'emailchange') {
    return redirectTo(request, response, '/profile', { email_changed: 'true' });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.warn('[Auth Callback] No user after session exchange:', userError?.message);
    return redirectTo(request, response, '/login', { error: 'session_missing' });
  }

  console.log('[Auth Callback] User authenticated:', {
    userId: user.id,
    emailConfirmed: !!user.email_confirmed_at,
    metadataAccountType: user.user_metadata?.account_type,
  });

  // CRITICAL: Ensure profile exists and role/account_type are synchronized BEFORE redirect routing.
  // This is the single most important step to prevent race conditions.
  const profile = await ensureProfileAndRole(supabase, user);

  console.log('[Auth Callback] Profile state:', {
    userId: user.id,
    profileExists: !!profile,
    role: profile?.role,
    accountRole: profile?.account_role,
    onboardingCompletedAt: profile?.onboarding_completed_at,
  });

  // Best effort sync for profile verification metadata.
  if (user.email_confirmed_at) {
    await supabase
      .from('profiles')
      .update({
        email_verified: true,
        email_verified_at: user.email_confirmed_at,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.warn('[Auth Callback] Failed to sync email verification status:', updateError.message);
        }
      });
  }

  const resolvedRole = resolveRole(user, profile);
  const destination = resolveDestination(resolvedRole, profile);

  console.log('[Auth Callback] Redirecting:', { userId: user.id, resolvedRole, destination });

  return redirectTo(request, response, destination);
}
