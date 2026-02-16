"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '../lib/supabase/client';
import { AuthService } from '../lib/auth';
import type { AuthUser } from '../lib/types/database';

function isSchemaCacheError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('schema cache') && message.includes('onboarding_completed_at');
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string, desiredRole?: 'user' | 'business_owner') => Promise<AuthUser | null>;
  register: (
    email: string,
    password: string,
    username: string,
    accountType?: 'user' | 'business_owner',
    displayName?: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<AuthUser>) => Promise<void>;
  refreshUser: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
  }>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Safe default when used outside AuthProvider (e.g. SSR or before mount). Guests see this until provider runs. */
const DEFAULT_AUTH_CONTEXT: AuthContextType = {
  user: null,
  isLoading: false,
  error: null,
  login: async () => null,
  register: async () => false,
  logout: async () => {},
  updateUser: async () => {},
  refreshUser: async () => {},
  resendVerificationEmail: async () => ({ success: false }),
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = getBrowserSupabase();

  // Deduplicate concurrent getCurrentUser calls: reuse the same in-flight promise
  const fetchingUserRef = useRef<Promise<AuthUser | null> | null>(null);
  const initCompleteRef = useRef(false);

  const deduplicatedGetCurrentUser = useCallback((): Promise<AuthUser | null> => {
    if (fetchingUserRef.current) {
      return fetchingUserRef.current;
    }
    const promise = AuthService.getCurrentUser().finally(() => {
      fetchingUserRef.current = null;
    });
    fetchingUserRef.current = promise;
    return promise;
  }, []);

  // Initialize auth state with retry logic (mobile-optimized)
  useEffect(() => {
    let isMounted = true;

    // Mobile devices get fewer retries and shorter timeouts
    const isMobile = typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const MAX_RETRIES = isMobile ? 1 : 3;
    const RETRY_DELAY_MS = isMobile ? 500 : 1000;

    const initializeAuth = async () => {
      console.log('[AuthContext] Initializing auth...');
      setIsLoading(true);

      const attemptInit = async (attempt: number): Promise<void> => {
        if (!isMounted) return;

        console.log(`[AuthContext] Auth init attempt ${attempt}/${MAX_RETRIES}`);

        try {
          const currentUser = await deduplicatedGetCurrentUser();

          if (!isMounted) return;

          console.log('[AuthContext] Got current user:', currentUser ? {
            id: currentUser.id,
            email: currentUser.email,
            email_verified: currentUser.email_verified,
            has_profile: !!currentUser.profile,
          } : null);

          setUser(currentUser);
          setIsLoading(false);
          initCompleteRef.current = true;
          console.log('[AuthContext] Auth initialization complete');
        } catch (error) {
          console.error(`[AuthContext] Error initializing auth (attempt ${attempt}/${MAX_RETRIES}):`, error);

          if (attempt < MAX_RETRIES) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isNetworkError =
              errorMessage.toLowerCase().includes('fetch') ||
              errorMessage.toLowerCase().includes('network') ||
              errorMessage.toLowerCase().includes('connection');

            if (isNetworkError) {
              const delay = RETRY_DELAY_MS * attempt;
              console.log(`[AuthContext] Network error, retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return attemptInit(attempt + 1);
            }
          }

          if (isMounted) {
            setIsLoading(false);
            initCompleteRef.current = true;
          }
        }
      };

      attemptInit(1);
    };

    initializeAuth();

    // Listen for auth changes - MIDDLEWARE HANDLES ROUTING
    // Use a debounce timer so rapid-fire events (INITIAL_SESSION + SIGNED_IN)
    // collapse into a single getCurrentUser() call.
    let authChangeTimer: ReturnType<typeof setTimeout> | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthContext: Auth state change', { event, session_exists: !!session });

      // Broadcast to other tabs (storage events only fire in *other* tabs)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('auth_state_changed', JSON.stringify({
            type: event,
            timestamp: Date.now(),
            user_id: session?.user?.id
          }));
          setTimeout(() => localStorage.removeItem('auth_state_changed'), 100);
        } catch {
          // Ignore localStorage errors (private browsing, etc.)
        }
      }

      // Sign-out is immediate — no need to fetch
      if (!session?.user) {
        if (authChangeTimer) clearTimeout(authChangeTimer);
        console.log('AuthContext: User signed out');
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Debounce: collapse rapid successive events into one fetch
      if (authChangeTimer) clearTimeout(authChangeTimer);
      authChangeTimer = setTimeout(async () => {
        // Skip if init hasn't completed yet (init will handle the first fetch)
        if (!initCompleteRef.current) return;

        try {
          const currentUser = await deduplicatedGetCurrentUser();
          if (isMounted && currentUser) {
            console.log('AuthContext: User state updated', {
              email: currentUser.email,
              email_verified: currentUser.email_verified,
            });
            setUser(currentUser);
            setIsLoading(false);
          }
        } catch (error) {
          console.warn('AuthContext: Error getting user from auth event:', error);
          if (isMounted) setIsLoading(false);
        }
      }, 300);
    });

    // Cross-tab sync via storage events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_state_changed' && e.newValue) {
        try {
          const authEvent = JSON.parse(e.newValue);
          if (authEvent.type === 'SIGNED_IN' || authEvent.type === 'SIGNED_OUT') {
            console.log('AuthContext: Auth state changed in another tab, refreshing...');
            deduplicatedGetCurrentUser().then(u => {
              if (isMounted) setUser(u);
            }).catch(err => {
              console.warn('AuthContext: Error refreshing after storage event:', err);
            });
          }
        } catch {
          // Ignore parse errors
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (authChangeTimer) clearTimeout(authChangeTimer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [supabase, deduplicatedGetCurrentUser]);

  const login = async (email: string, password: string, desiredRole?: 'user' | 'business_owner'): Promise<AuthUser | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { user: authUser, error: authError } = await AuthService.signIn({ email, password });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return null;
      }

      if (authUser) {
        const profileRole = String(authUser.profile?.role ?? '');
        const profileAccountRole = String(authUser.profile?.account_role ?? '');

        // Check if user has the desired role
        if (desiredRole && authUser.profile) {
          const userRole = profileRole;
          const hasDesiredRole =
            userRole === 'admin' || userRole === 'both' || userRole === desiredRole;

          if (!hasDesiredRole) {
            const accountTypeName = desiredRole === 'user' ? 'Personal' : 'Business';
            const existingTypeName =
              userRole === 'admin'
                ? 'Admin'
                : userRole === 'user'
                  ? 'Personal'
                  : 'Business';
            setError(`This email only has a ${existingTypeName} account. Please select ${existingTypeName} to log in, or register a new ${accountTypeName} account.`);
            setIsLoading(false);
            // Sign out since login was incorrect
            await AuthService.signOut();
            return null;
          }
        }

        setUser(authUser);
        let activeUser = authUser;

        // Optionally switch role if user selected a different mode and they have access
        if (desiredRole && authUser.profile) {
          const isAdminAccount =
            profileRole === 'admin' ||
            profileAccountRole === 'admin';
          const hasDesiredRole =
            profileRole === 'both' || profileRole === desiredRole;
          const needsSwitch =
            !isAdminAccount && profileAccountRole !== desiredRole;

          if (hasDesiredRole && needsSwitch) {
            try {
              const response = await fetch('/api/user/switch-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newRole: desiredRole })
              });

              if (response.ok) {
                activeUser = {
                  ...authUser,
                  profile: {
                    ...authUser.profile,
                    account_role: desiredRole
                  }
                };
                setUser(activeUser);
              }
            } catch (switchError) {
              console.warn('AuthContext: Failed to switch role after login', switchError);
            }
          }
        }

        // ============================================
        // SIMPLIFIED LOGIN ROUTING
        // Single source of truth: profiles.onboarding_completed_at
        // ============================================

        // Step 1: Check email verification
        if (!authUser.email_verified) {
          router.push('/verify-email');
          setIsLoading(false);
          return activeUser;
        }

        // Step 2: Determine account type
        const userCurrentRole =
          String(activeUser.profile?.account_role || activeUser.profile?.role || 'user');
        const isAdminAccount =
          userCurrentRole === 'admin' || String(activeUser.profile?.role ?? '') === 'admin';
        const isBusinessAccount = !isAdminAccount && userCurrentRole === 'business_owner';

        // Step 3: Route based on account type and onboarding status
        if (isAdminAccount) {
          router.push('/admin');
        } else if (isBusinessAccount) {
          // Business accounts NEVER need personal onboarding
          router.push('/my-businesses');
        } else if (activeUser.profile?.onboarding_completed_at) {
          // Personal user with completed onboarding -> complete
          router.push('/complete');
        } else {
          // Personal user with incomplete onboarding → start onboarding
          router.push('/interests');
        }

        setIsLoading(false);
        return activeUser;
      }

      setIsLoading(false);
      return null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setError(message);
      setIsLoading(false);
      return null;
    }
  };

    const register = async (
      email: string,
      password: string,
      username: string,
      accountType: 'user' | 'business_owner' = 'user',
      displayName?: string
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('AuthContext: Starting registration...', { email, accountType });
        const { user: authUser, session, error: authError } = await AuthService.signUp({
          email,
          password,
          username,
          accountType,
          displayName
        });
        if (authError) {
          const rawMessage = authError?.message || '';
          const rawCode = authError?.code || 'unknown';
          if (rawMessage || rawCode !== 'unknown') {
            console.warn('AuthContext: Registration error details:', {
              message: rawMessage || 'Unknown error',
              code: rawCode,
            });
          }

          let errorMessage = rawMessage || 'Email already registered. Please log in.';
          if (
            authError.code === 'user_exists' ||
            authError.code === 'duplicate_account_type' ||
            rawMessage.toLowerCase().includes('already in use') ||
            rawMessage.toLowerCase().includes('already registered') ||
            rawMessage.toLowerCase().includes('email already') ||
            rawMessage.toLowerCase().includes('already exists')
          ) {
            errorMessage = rawMessage || 'Email already registered. Please log in.';
          }
          setError(errorMessage);
          setIsLoading(false);
          return false;
        }
        if (authUser) {
          console.log('AuthContext: Registration successful', {
            email: authUser.email,
            email_verified: authUser.email_verified,
            user_id: authUser.id,
            has_session: !!session,
            session_data: session
          });
          setUser(authUser);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('pendingVerificationEmail', authUser.email);
            sessionStorage.setItem('pendingVerificationAccountType', accountType);
          }
          router.push('/verify-email');
        }
        setIsLoading(false);
        return true;
      } catch (error: unknown) {
        console.log('AuthContext: Registration exception', error);
        const message = error instanceof Error ? error.message : 'Registration failed';
        setError(message);
        setIsLoading(false);
        return false;
      }
    };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    // Optimistic local clear keeps admin sign-out visually instant.
    setUser(null);

    try {
      const { error: signOutError } = await AuthService.signOut();

      if (signOutError) {
        setError(signOutError.message);
        return;
      }

      // Use hard navigation so stale in-memory state cannot keep admin UI mounted.
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
        return;
      }

      router.replace('/login');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userData?: Partial<AuthUser>): Promise<void> => {
    if (!user) return;
    
    // Early guard: prevent crashes if called without arguments or with undefined
    if (!userData) return;

    setIsLoading(true);
    setError(null);

    try {
      // Update user profile in Supabase if profile data is being updated
      if (userData?.profile) {
        // Prepare profile updates - only update fields that exist in the profiles table
        const profileUpdates: Record<string, any> = {
          updated_at: new Date().toISOString()
        };

        // Only update onboarding_step if provided
        if (userData.profile.onboarding_step) {
          profileUpdates.onboarding_step = userData.profile.onboarding_step;
        }

        // Update avatar_url if provided
        if (userData.profile.avatar_url !== undefined) {
          profileUpdates.avatar_url = userData.profile.avatar_url;
        }

        // Update username if provided (allow null/empty to clear)
        if (userData.profile.username !== undefined) {
          profileUpdates.username = userData.profile.username?.trim() || null;
        }

        // Update display_name if provided (allow null/empty to clear)
        if (userData.profile.display_name !== undefined) {
          profileUpdates.display_name = userData.profile.display_name?.trim() || null;
        }

        // Update the profiles table with valid fields only
        const { error } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('user_id', user.id);

        if (error) throw error;

        // Handle interests separately using the dedicated API
        if (userData?.profile?.interests && Array.isArray(userData.profile.interests)) {
          try {
            const response = await fetch('/api/user/interests', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ selections: userData.profile.interests })
            });
            if (!response.ok) {
              console.warn('Failed to update interests:', await response.text());
            }
          } catch (interestError) {
            console.warn('Error updating interests:', interestError);
          }
        }

        // Handle subcategories separately using the dedicated API
        if (userData?.profile?.sub_interests && Array.isArray(userData.profile.sub_interests)) {
          try {
            const response = await fetch('/api/user/subcategories', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subcategories: userData.profile.sub_interests })
            });
            if (!response.ok) {
              console.warn('Failed to update subcategories:', await response.text());
            }
          } catch (subcatError) {
            console.warn('Error updating subcategories:', subcatError);
          }
        }
      }

      // Fetch fresh profile data from database to ensure we have the latest data including username and display_name
      let { data: freshProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('user_id, onboarding_step, onboarding_complete, onboarding_completed_at, interests_count, last_interests_updated, created_at, updated_at, avatar_url, username, display_name, is_top_reviewer, reviews_count, badges_count, subcategories_count, dealbreakers_count')
        .eq('user_id', user.id)
        .single();

      if (fetchError && isSchemaCacheError(fetchError)) {
        ({ data: freshProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('user_id, onboarding_step, onboarding_complete, interests_count, last_interests_updated, created_at, updated_at, avatar_url, username, display_name, is_top_reviewer, reviews_count, badges_count, subcategories_count, dealbreakers_count')
          .eq('user_id', user.id)
          .single());
      }

      // Transform fresh profile data to match the profile structure
      let transformedProfile = null;
      if (userData && userData.profile) {
        transformedProfile = {
          username: userData.profile.username !== undefined
            ? (userData.profile.username?.trim() || undefined)
            : user.profile?.username,
          display_name: userData.profile.display_name !== undefined
            ? (userData.profile.display_name?.trim() || undefined)
            : user.profile?.display_name,
          avatar_url: userData.profile.avatar_url !== undefined
            ? userData.profile.avatar_url
            : user.profile?.avatar_url,
        };
      }

      // Update local user state with fresh data from database or provided data
      try {
        const updatedUser = {
          ...user,
          ...userData,
          profile: transformedProfile || (userData.profile ? { ...user.profile, ...userData.profile } : user.profile)
        };
        console.log('Updated user state with fresh profile data:', {
          username: updatedUser.profile?.username,
          display_name: updatedUser.profile?.display_name,
          avatar_url: updatedUser.profile?.avatar_url
        });
        setUser(updatedUser);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Update failed';
        setError(message);
        // Re-throw so calling code can handle the error
        throw error;
      } finally {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('AuthContext: Error updating user:', error);
      setError('Failed to update user data');
      setIsLoading(false);
    }
  };

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!user) return;
    
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error: unknown) {
      console.warn('AuthContext: Error refreshing user:', error);
      // Don't set error state for refresh failures - just log it
    }
  }, [user]);

  const resendVerificationEmail = async (
    email: string
  ): Promise<{ success: boolean; errorCode?: string; errorMessage?: string }> => {
    // Don't set global isLoading - callers manage their own loading state (isResending).
    // Setting isLoading here causes the verify-email page to show a full-page spinner,
    // hiding the resend button and any error feedback.
    setError(null);
    const normalizedEmail = email?.trim().toLowerCase();

    try {
      if (!normalizedEmail) {
        const message = 'No email address available to resend verification.';
        setError(message);
        return {
          success: false,
          errorCode: 'missing_email',
          errorMessage: message,
        };
      }

      // Resend should only apply to accounts that are not yet verified.
      if (
        user?.email_verified &&
        user.email?.trim().toLowerCase() === normalizedEmail
      ) {
        return {
          success: false,
          errorCode: 'already_verified',
          errorMessage: 'Your email is already verified. Please log in.',
        };
      }

      const { error } = await AuthService.resendVerificationEmail(normalizedEmail);

      if (error) {
        console.error('AuthContext: resendVerificationEmail failed:', {
          email: normalizedEmail,
          code: error.code,
          message: error.message,
          details: error.details,
        });
        setError(error.message);
        return {
          success: false,
          errorCode: error.code,
          errorMessage: error.message,
        };
      }

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to resend verification email';
      console.error('AuthContext: resendVerificationEmail unexpected error:', {
        email: normalizedEmail,
        error,
      });
      setError(message);
      return {
        success: false,
        errorCode: 'unknown_error',
        errorMessage: message,
      };
    }
  };

  // Memoize context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(() => ({
    user,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    resendVerificationEmail,
    isLoading,
    error
  }), [user, isLoading, error, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  // When outside provider (e.g. SSR, or before layout mounts), return safe guest state so pages like /for-you don't 500
  if (context === undefined) {
    return DEFAULT_AUTH_CONTEXT;
  }
  return context;
}


