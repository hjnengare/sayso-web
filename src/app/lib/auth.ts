"use client";

import { getBrowserSupabase } from './supabase/client';
import type { AuthUser, SignUpData, SignInData, AuthError } from './types/database';
import type { Session } from '@supabase/supabase-js';

export class AuthService {
  private static getClient() {
    return getBrowserSupabase();
  }

  /**
   * Resolve site URL used for auth redirects.
   * Priority: NEXT_PUBLIC_SITE_URL -> NEXT_PUBLIC_BASE_URL -> runtime origin.
   */
  private static getSiteUrl(): string {
    const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL;
    if (configured?.trim()) {
      return configured.replace(/\/+$/, '');
    }

    if (typeof window !== 'undefined') {
      return window.location.origin.replace(/\/+$/, '');
    }

    return 'http://localhost:3000';
  }

  static async signUp({
    email,
    password,
    username,
    accountType = 'user',
    displayName
  }: SignUpData): Promise<{ user: AuthUser | null; session: Session | null; error: AuthError | null }> {
    const supabase = this.getClient();
    try {
      // Basic validation
      if (!email?.trim() || !password?.trim()) {
        return {
          user: null,
          session: null,
          error: { message: 'Email and password are required' }
        };
        
      }

      if (!username?.trim()) {
        return {
          user: null,
          session: null,
          error: { message: 'Username is required' }
        };
      }

      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username.trim())) {
        return {
          user: null,
          session: null,
          error: { message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' }
        };
      }

      if (!this.isValidEmail(email)) {
        return {
          user: null,
          session: null,
          error: { message: 'Please enter a valid email address' }
        };
      }

      if (password.length < 6) {
        return {
          user: null,
          session: null,
          error: { message: 'Password must be at least 6 characters long' }
        };
      }

      // Check if email already exists in profiles
      // Shared emails across account types are NOT allowed.
      const { data: existingProfiles, error: profileCheckError } = await supabase
        .from('profiles')
        .select('role, user_id')
        .eq('email', email.trim().toLowerCase());

      if (profileCheckError) {
        console.warn('Profile check error (blocking signup to avoid duplicates):', profileCheckError);
        return {
          user: null,
          session: null,
          error: {
            message: 'Unable to verify email availability. Please log in or try again later.',
            code: 'email_check_failed'
          }
        };
      }

      if (!profileCheckError && existingProfiles && existingProfiles.length > 0) {
        const existingRole = existingProfiles[0].role;
        const accountTypeName = accountType === 'user' ? 'Personal' : 'Business';
        const existingLabel = existingRole === 'business_owner' ? 'Business' : 'Personal';
        console.log(`Email already has an account, blocking ${accountTypeName} registration`);
        return {
          user: null,
          session: null,
          error: {
            message: `Email already registered for a ${existingLabel} account. Log in or use a different email.`,
            code: 'user_exists'
          }
        };
      }

      const siteUrl = this.getSiteUrl();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          data: {
            username: username.trim(),
            account_type: accountType, // Store account type in user metadata for profile creation
            display_name: displayName?.trim() || undefined
          }
        }
      });

      if (error) {
        const lowerMessage = error.message?.toLowerCase() || '';
        if (lowerMessage.includes('email address') && lowerMessage.includes('invalid')) {
          console.warn('Supabase signup validation error:', error.message);
        } else {
          console.error('Supabase signup error:', error);
        }
        
        // Check if error is because email already exists in auth.users
        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = error.code?.toLowerCase() || '';

        // Handle rate limit separately — not an "already registered" error
        if (errorCode === 'over_email_signup_rate_limit' ||
            errorMessage.includes('email rate limit exceeded') ||
            errorMessage.includes('rate limit')) {
          return {
            user: null,
            session: null,
            error: { message: 'Too many signup attempts. Please wait a few minutes and try again.', code: 'rate_limit' }
          };
        }

        if (errorMessage.includes('already registered') ||
            errorMessage.includes('user already exists') ||
            errorCode === 'user_already_exists') {
          const existingRole = existingProfiles?.[0]?.role;
          const existingLabel = existingRole === 'business_owner' ? 'Business' : 'Personal';
          return {
            user: null,
            session: null,
            error: {
              message: existingRole
                ? `Email already registered for a ${existingLabel} account. Log in or use a different email.`
                : 'Email already registered. Please log in or use a different email.',
              code: 'user_exists'
            }
          };
        }
        
        return {
          user: null,
          session: null,
          error: this.handleSupabaseError(error)
        };
      }

      if (!data.user) {
        return {
          user: null,
          session: null,
          error: { message: 'Registration failed. Please try again.', code: 'registration_failed' }
        };
      }

      // Profile creation is handled by database trigger on auth.users insert
      // No need for additional API call

      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          email_verified: data.user.email_confirmed_at !== null,
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at
        },
        session: data.session, // This will be null until email is verified
        error: null
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      return {
        user: null,
        session: null,
        error: {
          message,
          code: 'unknown_error',
          details: error
        }
      };
    }
  }

  static async signIn({ email, password }: SignInData): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    const supabase = this.getClient();
    try {
      if (!email?.trim() || !password?.trim()) {
        return {
          user: null,
          error: { message: 'Email and password are required' }
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (error) {
        return {
          user: null,
          error: this.handleSupabaseError(error)
        };
      }

      if (!data.user) {
        return {
          user: null,
          error: { message: 'Login failed. Please try again.' }
        };
      }

      // Get user profile
      const profile = await this.getUserProfile(data.user.id);

      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          email_verified: data.user.email_confirmed_at !== null,
          created_at: data.user.created_at,
          updated_at: data.user.updated_at || data.user.created_at,
          profile: profile
        },
        error: null
      };
    } catch (error: unknown) {
      return {
        user: null,
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          details: error
        }
      };
    }
  }

  static async signOut(): Promise<{ error: AuthError | null }> {
    const supabase = this.getClient();
    try {
      // Start global revoke in background to avoid blocking UI on slow networks.
      const globalSignOutPromise = supabase.auth.signOut({ scope: 'global' })
        .catch((err: unknown) => {
          console.warn('AuthService: Background global sign out failed:', err);
          return { error: null };
        });

      // Always clear local session immediately for fast route transitions.
      const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
      if (localError && !this.isAuthSessionMissingError(localError.message)) {
        return { error: this.handleSupabaseError(localError) };
      }

      void globalSignOutPromise;

      return { error: null };
    } catch (error: unknown) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          details: error
        }
      };
    }
  }

  static async getCurrentUser(retryCount = 0): Promise<AuthUser | null> {
    console.log(`[AuthService.getCurrentUser] Starting (attempt ${retryCount + 1})`);
    const supabase = this.getClient();
    const MAX_RETRIES = 2;

    try {
      // Get current session first to check if refresh is needed
      console.log('[AuthService.getCurrentUser] Getting session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('[AuthService.getCurrentUser] Got session:', {
        has_session: !!session,
        session_error: sessionError?.message
      });
      
      // If session exists but is expired, try to refresh it
      if (session && session.expires_at) {
        const expiresAt = session.expires_at * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        
        // If token expires in less than 5 minutes, refresh proactively
        if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData?.session) {
              console.log('AuthService: Proactively refreshed session');
            }
          } catch (refreshErr) {
            console.warn('AuthService: Failed to proactively refresh session:', refreshErr);
          }
        }
      }

      console.log('[AuthService.getCurrentUser] Getting user...');
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log('[AuthService.getCurrentUser] Got user:', {
        has_user: !!user,
        user_id: user?.id,
        email: user?.email,
        error: error?.message
      });

      // Handle authentication errors with retry logic
      if (error) {
        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = error.code?.toLowerCase() || '';
        
        // Check for session-related errors that should be handled gracefully
        const isSessionError = 
          errorMessage.includes('refresh token') ||
          errorMessage.includes('invalid refresh token') ||
          errorMessage.includes('refresh token not found') ||
          errorMessage.includes('user from sub claim') ||
          errorMessage.includes('jwt does not exist') ||
          errorMessage.includes('user does not exist') ||
          errorMessage.includes('session missing') ||
          errorMessage.includes('auth session missing') ||
          errorCode === 'refresh_token_not_found' ||
          errorCode === 'user_not_found' ||
          errorCode === 'session_not_found';

        const isNetworkError = 
          errorMessage.includes('fetch') ||
          errorMessage.includes('network') ||
          errorMessage.includes('connection') ||
          errorMessage.includes('timeout') ||
          errorCode === 'network_error';

        // For network errors, retry up to MAX_RETRIES times
        if (isNetworkError && retryCount < MAX_RETRIES) {
          console.warn(`AuthService: Network error, retrying (${retryCount + 1}/${MAX_RETRIES}):`, error.message);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
          return this.getCurrentUser(retryCount + 1);
        }

        // For refresh token errors, try to refresh session once
        if (errorMessage.includes('refresh token') && retryCount === 0) {
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData?.session) {
              console.log('AuthService: Successfully refreshed session after error');
              // Retry getting user after refresh
              return this.getCurrentUser(retryCount + 1);
            }
          } catch (refreshErr) {
            console.warn('AuthService: Failed to refresh session:', refreshErr);
          }
        }

        // For session errors, silently return null (user is not authenticated)
        if (isSessionError) {
          // Only log if it's not a simple "session missing" (which is expected for unauthenticated users)
          if (!errorMessage.includes('session missing') && !errorMessage.includes('auth session missing')) {
            console.warn('AuthService: Session error detected (not signing out):', {
              message: error.message,
              code: error.code
            });
          }
          return null;
        }
        
        // For other errors, log and return null
        console.error('AuthService: Error getting current user:', error);
        return null;
      }

      if (!user) {
        console.log('[AuthService.getCurrentUser] No user found, returning null');
        return null;
      }

      // Get user profile with error handling
      let profile;
      try {
        console.log('[AuthService.getCurrentUser] Fetching profile for user:', user.id);
        profile = await this.getUserProfile(user.id);
        if (profile) {
          console.log('[AuthService.getCurrentUser] Got profile:', {
            has_profile: true,
            onboarding_step: profile.onboarding_step,
            role: profile.role,
            account_role: profile.account_role,
            account_type: profile.account_type,
            email_verified: user.email_confirmed_at !== null
          });
        } else {
          console.log('[AuthService.getCurrentUser] No profile found for user:', user.id);
        }
      } catch (profileError) {
        console.warn('AuthService: Error fetching profile, continuing without profile:', profileError);
        profile = undefined;
      }

      console.log('[AuthService.getCurrentUser] Returning user with profile:', {
        id: user.id,
        role: profile?.role,
        account_role: profile?.account_role,
        account_type: profile?.account_type,
        onboarding_step: profile?.onboarding_step
      });
      return {
        id: user.id,
        email: user.email!,
        email_verified: user.email_confirmed_at !== null,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
        profile: profile
      };
    } catch (error) {
      // Handle unexpected errors with retry for network issues
      const errorMessage = error instanceof Error ? error.message : String(error);
      const lowerMessage = errorMessage.toLowerCase();
      
      const isNetworkError = 
        lowerMessage.includes('fetch') ||
        lowerMessage.includes('network') ||
        lowerMessage.includes('connection') ||
        lowerMessage.includes('timeout');
      
      // Retry on network errors
      if (isNetworkError && retryCount < MAX_RETRIES) {
        console.warn(`AuthService: Network error in catch, retrying (${retryCount + 1}/${MAX_RETRIES}):`, errorMessage);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.getCurrentUser(retryCount + 1);
      }
      
      // Check if it's a session/auth error that requires clearing the session
      const isSessionError = 
        lowerMessage.includes('refresh token') ||
        lowerMessage.includes('invalid refresh token') ||
        lowerMessage.includes('refresh token not found') ||
        lowerMessage.includes('user from sub claim') ||
        lowerMessage.includes('jwt does not exist') ||
        lowerMessage.includes('user does not exist') ||
        lowerMessage.includes('session missing') ||
        lowerMessage.includes('auth session missing');

      if (isSessionError) {
        // Only log if it's not a simple "session missing" (which is expected for unauthenticated users)
        if (!lowerMessage.includes('session missing') && !lowerMessage.includes('auth session missing')) {
          console.warn('AuthService: Session error in catch block (not signing out):', errorMessage);
        }
      } else {
        console.error('AuthService: Unexpected error getting current user:', error);
      }
      return null;
    }
  }

  // Removed createUserProfile - database trigger handles profile creation

  private static async getUserProfile(userId: string) {
    const supabase = this.getClient();
    try {
      const isSchemaCacheError = (profileError: { message?: string } | null | undefined) => {
        const message = profileError?.message?.toLowerCase() || '';
        return message.includes('schema cache') && message.includes('onboarding_completed_at');
      };

      let { data, error } = await supabase
        .from('profiles')
        .select('user_id, onboarding_step, onboarding_complete, onboarding_completed_at, interests_count, last_interests_updated, created_at, updated_at, avatar_url, username, display_name, is_top_reviewer, reviews_count, badges_count, subcategories_count, dealbreakers_count, is_active, deactivated_at, role, account_role, email, email_verified, email_verified_at')
        .eq('user_id', userId)
        .single();

      if (error && isSchemaCacheError(error)) {
        ({ data, error } = await supabase
          .from('profiles')
          .select('user_id, onboarding_step, onboarding_complete, interests_count, last_interests_updated, created_at, updated_at, avatar_url, username, display_name, is_top_reviewer, reviews_count, badges_count, subcategories_count, dealbreakers_count, is_active, deactivated_at, role, account_role, email, email_verified, email_verified_at')
          .eq('user_id', userId)
          .single());
      }

      if (error || !data) {
        console.log('getUserProfile: No data or error', error);
        return undefined;
      }

      // Reactivate account if it was deactivated (user is logging in)
      if (data.is_active === false) {
        const { error: reactivateError } = await supabase
          .from('profiles')
          .update({
            is_active: true,
            deactivated_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (reactivateError) {
          console.error('Error reactivating account:', reactivateError);
        } else {
          console.log('Account reactivated on login');
          // Update data to reflect reactivation
          data.is_active = true;
          data.deactivated_at = null;
        }
      }

      console.log('getUserProfile: Fetched avatar_url from DB:', data.avatar_url);

      const isOnboardingComplete = !!data.onboarding_completed_at;

      const profile = {
        id: data.user_id,
        onboarding_step: data.onboarding_step,
        onboarding_complete: isOnboardingComplete,
        onboarding_completed_at: data.onboarding_completed_at || undefined,
        interests_count: data.interests_count || 0,
        last_interests_updated: data.last_interests_updated,
        avatar_url: data.avatar_url || undefined,
        username: data.username || undefined,
        display_name: data.display_name || undefined,
        locale: 'en', // Default locale - locale column doesn't exist in profiles table
        is_top_reviewer: data.is_top_reviewer || false,
        reviews_count: data.reviews_count || 0,
        badges_count: data.badges_count || 0,
        subcategories_count: data.subcategories_count || 0,
        dealbreakers_count: data.dealbreakers_count || 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_active: data.is_active !== undefined ? data.is_active : true,
        deactivated_at: data.deactivated_at || undefined,
        role: data.role || 'user',
        account_role: data.account_role || 'user',
        email: data.email || undefined,
        email_verified: data.email_verified || false,
        email_verified_at: data.email_verified_at || undefined
      };

      console.log('getUserProfile: Returning profile with avatar_url:', profile.avatar_url);
      console.log('getUserProfile: Complete profile object:', profile);
      return profile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return undefined;
    }
  }

  private static isValidEmail(email: string): boolean {
    // More comprehensive email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email.trim().toLowerCase()) && email.length <= 254;
  }

  private static isStrongPassword(password: string): boolean {
    // Relaxed validation: minimum 6 characters, allows letters only, numbers only, or mix
    return password.length >= 6;
  }

  private static isAuthSessionMissingError(message?: string): boolean {
    const normalized = message?.toLowerCase() || '';
    return (
      normalized.includes('auth session missing') ||
      normalized.includes('session missing') ||
      normalized.includes('refresh token not found')
    );
  }

  private static handleSupabaseError(error: { message: string; error_code?: string }): AuthError {
    const message = error.message.toLowerCase();
    const errorCode = error.error_code?.toLowerCase() || '';

    // Email already in use
    if (
      errorCode === 'user_already_registered' ||
      errorCode === 'email_already_registered' ||
      message.includes('user already registered') ||
      message.includes('email already exists') ||
      message.includes('already been registered') ||
      message.includes('email address is already registered') ||
      message.includes('email is already in use') ||
      message.includes('this email is already registered') ||
      message.includes('email already registered') ||
      message.includes('duplicate key value') ||
      message.includes('unique constraint') ||
      (message.includes('email') && message.includes('already') && (message.includes('use') || message.includes('taken') || message.includes('registered')))
    ) {
      return { message: 'This email is already in use. Please log in or use a different email.', code: 'user_exists' };
    }

    // Invalid credentials
    if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
      return { message: 'Incorrect email or password. Please try again.', code: 'invalid_credentials' };
    }

    // Email not confirmed
    if (message.includes('email not confirmed')) {
      return { message: 'Your email is not yet verified. Please check your inbox for the confirmation link.', code: 'email_not_confirmed' };
    }

    // Email already confirmed
    if (
      message.includes('already confirmed') ||
      message.includes('email has already been confirmed') ||
      message.includes('already verified')
    ) {
      return { message: 'Your email is already verified. You can log in now.', code: 'already_verified' };
    }

    // Redirect URL / site URL configuration
    if (
      message.includes('redirect') &&
      (message.includes('not allowed') || message.includes('invalid') || message.includes('mismatch'))
    ) {
      return {
        message: 'Email redirect URL is not configured correctly. Please contact support or try again later.',
        code: 'invalid_redirect_url'
      };
    }

    // Rate limiting
    if (
      message.includes('too many requests') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('security purposes')
    ) {
      return { message: 'Too many attempts. Please wait a few minutes and try again.', code: 'rate_limit' };
    }

    // Signups disabled
    if (message.includes('signup is disabled') || message.includes('signups not allowed')) {
      return { message: 'New registrations are temporarily unavailable. Please try again later.', code: 'signup_disabled' };
    }

    // Weak password
    if (message.includes('password') && (message.includes('weak') || message.includes('requirements'))) {
      return { message: 'Password must be at least 6 characters long.', code: 'weak_password' };
    }

    // Invalid email format
    if (
      (message.includes('email') && (message.includes('invalid') || message.includes('format'))) ||
      (message.includes('email address') && message.includes('invalid'))
    ) {
      return { message: 'Please enter a valid email address (e.g. name@example.com).', code: 'invalid_email' };
    }

    // Network / connection issues
    if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      return { message: 'Connection issue. Please check your internet and try again.', code: 'network_error' };
    }

    // Unprocessable request
    if (message.includes('422') || message.includes('unprocessable')) {
      return { message: 'Request failed. Please check your details and try again.', code: 'invalid_data' };
    }

    // Default fallback
    return {
      message: error.message || 'Something went wrong. Please try again.',
      code: error.error_code || 'unknown_error'
    };
  }

  static async resendVerificationEmail(email: string): Promise<{ error: AuthError | null }> {
    const supabase = this.getClient();
    const normalizedEmail = email?.trim().toLowerCase();

    try {
      if (!normalizedEmail) {
        return {
          error: { message: 'Email is required.', code: 'missing_email' }
        };
      }

      if (!this.isValidEmail(normalizedEmail)) {
        return {
          error: { message: 'Please enter a valid email address.', code: 'invalid_email' }
        };
      }

      const siteUrl = this.getSiteUrl();
      const emailRedirectTo = `${siteUrl}/auth/callback`;

      // Helpful runtime diagnostics for local-vs-prod URL mismatches.
      if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) {
        try {
          const configuredOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL).origin;
          const runtimeOrigin = window.location.origin;
          if (configuredOrigin !== runtimeOrigin) {
            console.warn('[AuthService.resendVerificationEmail] NEXT_PUBLIC_SITE_URL origin differs from runtime origin', {
              configuredOrigin,
              runtimeOrigin,
            });
          }
        } catch (urlError) {
          console.warn('[AuthService.resendVerificationEmail] NEXT_PUBLIC_SITE_URL is invalid', {
            value: process.env.NEXT_PUBLIC_SITE_URL,
            error: urlError,
          });
        }
      }

      console.log('[AuthService.resendVerificationEmail] Requesting resend', {
        email: normalizedEmail,
        emailRedirectTo,
      });

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
        options: {
          emailRedirectTo,
        }
      });

      if (error) {
        console.error('[AuthService.resendVerificationEmail] Supabase resend failed', {
          email: normalizedEmail,
          emailRedirectTo,
          error,
        });
        return {
          error: this.handleSupabaseError(error)
        };
      }

      console.log('[AuthService.resendVerificationEmail] Resend request accepted', {
        email: normalizedEmail,
      });
      return { error: null };
    } catch (error: unknown) {
      console.error('[AuthService.resendVerificationEmail] Unexpected error:', {
        email: normalizedEmail,
        error,
      });
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to resend verification email',
          code: 'unknown_error',
          details: error,
        }
      };
    }
  }

  static async signInWithGoogle(): Promise<{ error: AuthError | null }> {
    const supabase = this.getClient();

    try {
      const baseUrl = this.getSiteUrl();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${baseUrl}/auth/callback?type=oauth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        return {
          error: this.handleSupabaseError(error)
        };
      }

      return { error: null };
    } catch (error: unknown) {
      console.error('Error in signInWithGoogle:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to sign in with Google'
        }
      };
    }
  }

  static async resetPasswordForEmail(email: string): Promise<{ error: AuthError | null }> {
    const supabase = this.getClient();

    try {
      if (!email?.trim()) {
        return {
          error: { message: 'Email is required' }
        };
      }

      if (!this.isValidEmail(email)) {
        return {
          error: { message: 'Please enter a valid email address' }
        };
      }

      const baseUrl = this.getSiteUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${baseUrl}/reset-password`,
      });

      if (error) {
        console.error('Reset password error:', error);
        return {
          error: this.handleSupabaseError(error)
        };
      }

      return { error: null };
    } catch (error: unknown) {
      console.error('Error in resetPasswordForEmail:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to send password reset email'
        }
      };
    }
  }

  static async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    const supabase = this.getClient();

    try {
      if (!newPassword?.trim()) {
        return {
          error: { message: 'Password is required' }
        };
      }

      if (newPassword.length < 6) {
        return {
          error: { message: 'Password must be at least 6 characters long' }
        };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Update password error:', error);
        return {
          error: this.handleSupabaseError(error)
        };
      }

      return { error: null };
    } catch (error: unknown) {
      console.error('Error in updatePassword:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to update password'
        }
      };
    }
  }

  static async changeEmail(newEmail: string): Promise<{ error: AuthError | null }> {
    const supabase = this.getClient();

    try {
      if (!newEmail?.trim()) {
        return {
          error: { message: 'Email is required' }
        };
      }

      if (!this.isValidEmail(newEmail)) {
        return {
          error: { message: 'Please enter a valid email address' }
        };
      }

      const baseUrl = this.getSiteUrl();
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim().toLowerCase(),
      }, {
        emailRedirectTo: `${baseUrl}/auth/callback?type=email_change`,
      });

      if (error) {
        console.error('Change email error:', error);
        return {
          error: this.handleSupabaseError(error)
        };
      }

      return { error: null };
    } catch (error: unknown) {
      console.error('Error in changeEmail:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to change email'
        }
      };
    }
  }

}

