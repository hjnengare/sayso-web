"use client";

import { getBrowserSupabase } from './supabase/client';
import type { AuthUser, SignUpData, SignInData, AuthError } from './types/database';
import type { Session } from '@supabase/supabase-js';

export class AuthService {
  private static getClient() {
    return getBrowserSupabase();
  }

  /**
   * Get the base URL for redirects - uses NEXT_PUBLIC_BASE_URL if available,
   * otherwise falls back to window.location.origin or Vercel production URL
   */
  private static getBaseUrl(): string {
    if (typeof window === 'undefined') {
      return process.env.NEXT_PUBLIC_BASE_URL || 'https://sayso-nine.vercel.app';
    }
    return process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
  }

  static async signUp({ email, password, username, accountType = 'user' }: SignUpData): Promise<{ user: AuthUser | null; session: Session | null; error: AuthError | null }> {
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

      if (password.length < 8) {
        return {
          user: null,
          session: null,
          error: { message: 'Password must be at least 8 characters long' }
        };
      }

      if (!this.isStrongPassword(password)) {
        return {
          user: null,
          session: null,
          error: { message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' }
        };
      }

      const baseUrl = this.getBaseUrl();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          emailRedirectTo: `${baseUrl}/auth/callback`,
          data: {
            username: username.trim(),
            accountType: accountType
          }
        }
      });

      if (error) {
        console.error('Supabase signup error:', error);
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
          error: { message: 'Registration failed. Please try again.' }
        };
      }

      // Ensure profile is created (fallback if database trigger fails, especially on mobile)
      // Use a small delay to allow trigger to run first, then check and create if needed
      try {
        // Wait a bit for the trigger to potentially create the profile
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to ensure profile exists via API (non-blocking, won't fail registration)
        fetch('/api/user/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch((err) => {
          // Silently fail - profile creation is best effort
          console.warn('Failed to ensure profile creation:', err);
        });
      } catch (profileError) {
        // Don't fail registration if profile creation check fails
        console.warn('Error ensuring profile creation:', profileError);
      }

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
      return {
        user: null,
        session: null,
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
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
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: this.handleSupabaseError(error) };
      }

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
            console.warn('AuthService: Invalid session detected, clearing session:', {
              message: error.message,
              code: error.code
            });
            // Clear the invalid session
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              // Ignore sign out errors - we're already handling an error state
              console.warn('AuthService: Error during sign out after session failure:', signOutError);
            }
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
        console.log('[AuthService.getCurrentUser] Got profile:', {
          has_profile: !!profile,
          onboarding_step: profile?.onboarding_step,
          email_verified: user.email_confirmed_at !== null
        });
      } catch (profileError) {
        console.warn('AuthService: Error fetching profile, continuing without profile:', profileError);
        profile = undefined;
      }

      console.log('[AuthService.getCurrentUser] Returning user with profile');
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
        // Only log and clear if it's not a simple "session missing" (which is expected for unauthenticated users)
        if (!lowerMessage.includes('session missing') && !lowerMessage.includes('auth session missing')) {
          console.warn('AuthService: Invalid session detected in catch block, clearing session:', errorMessage);
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.warn('AuthService: Error during sign out after session failure:', signOutError);
          }
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
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, onboarding_step, interests_count, last_interests_updated, created_at, updated_at, avatar_url, username, display_name, is_top_reviewer, reviews_count, badges_count, subcategories_count, dealbreakers_count, is_active, deactivated_at')
        .eq('user_id', userId)
        .single();

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

      const profile = {
        id: data.user_id,
        onboarding_step: data.onboarding_step,
        onboarding_complete: data.onboarding_step === 'complete',
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
        deactivated_at: data.deactivated_at || undefined
      };

      console.log('getUserProfile: Returning profile with avatar_url:', profile.avatar_url);
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
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return strongPasswordRegex.test(password);
  }

  private static handleSupabaseError(error: { message: string; error_code?: string }): AuthError {
    // Handle specific error messages from Supabase
    const message = error.message.toLowerCase();
    const errorCode = error.error_code?.toLowerCase() || '';

    // Check for email already in use - check both error code and message
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
      return { message: '❌ This email address is already in use. Please try logging in instead or use a different email.', code: 'user_exists' };
    }

    if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
      return { message: '❌ Invalid email or password. Please check your credentials.', code: 'invalid_credentials' };
    }

    if (message.includes('email not confirmed')) {
      return { message: '📧 Please check your email and click the confirmation link to verify your account.', code: 'email_not_confirmed' };
    }

    if (message.includes('too many requests') || message.includes('rate limit')) {
      return { message: '⏰ Too many attempts. Please wait a moment and try again.', code: 'rate_limit' };
    }

    if (message.includes('signup is disabled') || message.includes('signups not allowed')) {
      return { message: '🚫 New registrations are temporarily unavailable. Please try again later.', code: 'signup_disabled' };
    }

    if (message.includes('password') && (message.includes('weak') || message.includes('requirements'))) {
      return { message: '🔐 Password doesn\'t meet security requirements. Use 8+ characters with uppercase, lowercase, and numbers.', code: 'weak_password' };
    }

    if (message.includes('email') && (message.includes('invalid') || message.includes('format'))) {
      return { message: '📧 Please enter a valid email address (e.g., user@example.com).', code: 'invalid_email' };
    }

    if (message.includes('email address') && message.includes('invalid')) {
      return { message: '📧 The email address format is invalid. Please check and try again.', code: 'invalid_email_format' };
    }

    if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      return { message: '🌐 Connection issue. Please check your internet and try again.', code: 'network_error' };
    }

    if (message.includes('422') || message.includes('unprocessable')) {
      return { message: '❌ Registration failed. Please check that your email and password are valid.', code: 'invalid_data' };
    }

    // Default fallback with more user-friendly message
    return {
      message: error.message || '❌ Something went wrong. Please try again in a moment.',
      code: error.error_code || 'unknown_error'
    };
  }

  static async resendVerificationEmail(email: string): Promise<{ error: AuthError | null }> {
    const supabase = this.getClient();

    try {
      const baseUrl = this.getBaseUrl();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${baseUrl}/auth/callback`,
        }
      });

      if (error) {
        console.error('Error resending verification email:', error);
        return {
          error: this.handleSupabaseError(error)
        };
      }

      return { error: null };
    } catch (error: unknown) {
      console.error('Error in resendVerificationEmail:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to resend verification email'
        }
      };
    }
  }

  static async signInWithGoogle(): Promise<{ error: AuthError | null }> {
    const supabase = this.getClient();

    try {
      const baseUrl = this.getBaseUrl();
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

      const baseUrl = this.getBaseUrl();
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

      if (newPassword.length < 8) {
        return {
          error: { message: 'Password must be at least 8 characters long' }
        };
      }

      if (!this.isStrongPassword(newPassword)) {
        return {
          error: { message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' }
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

      const baseUrl = this.getBaseUrl();
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
