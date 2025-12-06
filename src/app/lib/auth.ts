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

  static async signUp({ email, password, username }: SignUpData): Promise<{ user: AuthUser | null; session: Session | null; error: AuthError | null }> {
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
            username: username.trim()
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

      // Profile will be created by database trigger, no need to create manually

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

  static async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = this.getClient();
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      // Handle authentication errors - clear invalid session
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

        // For session errors, silently return null (user is not authenticated)
        if (isSessionError) {
          // Only log if it's not a simple "session missing" (which is expected for unauthenticated users)
          if (!errorMessage.includes('session missing') && !errorMessage.includes('auth session missing')) {
            console.warn('Invalid session detected, clearing session:', {
              message: error.message,
              code: error.code
            });
            // Clear the invalid session
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              // Ignore sign out errors - we're already handling an error state
              console.warn('Error during sign out after session failure:', signOutError);
            }
          }
          return null;
        }
        // For other errors, log and return null
        console.error('Error getting current user:', error);
        return null;
      }

      if (!user) return null;

      const profile = await this.getUserProfile(user.id);

      return {
        id: user.id,
        email: user.email!,
        email_verified: user.email_confirmed_at !== null,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
        profile: profile
      };
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const lowerMessage = errorMessage.toLowerCase();
      
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
          console.warn('Invalid session detected in catch block, clearing session:', errorMessage);
          try {
            const supabase = this.getClient();
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.warn('Error during sign out after session failure:', signOutError);
          }
        }
      } else {
        console.error('Error getting current user:', error);
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
        .select('user_id, onboarding_step, interests_count, last_interests_updated, created_at, updated_at, avatar_url, username, display_name, is_top_reviewer, reviews_count, badges_count, subcategories_count, dealbreakers_count')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        console.log('getUserProfile: No data or error', error);
        return undefined;
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
        updated_at: data.updated_at
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

    if (message.includes('user already registered') || message.includes('email already exists') || message.includes('already been registered')) {
      return { message: '❌ This email address is already taken. Try logging in instead.', code: 'user_exists' };
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
