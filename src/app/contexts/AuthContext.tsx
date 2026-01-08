"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '../lib/supabase/client';
import { AuthService } from '../lib/auth';
import { RateLimiter } from '../lib/rateLimiting';
import type { AuthUser } from '../lib/types/database';

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<AuthUser>) => Promise<void>;
  refreshUser: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = getBrowserSupabase();

  // Initialize auth state with retry logic
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    const initializeAuth = async () => {
      console.log('AuthContext: Initializing auth...');
      setIsLoading(true);

      const attemptInit = async (attempt: number): Promise<void> => {
        if (!isMounted) return;
        
        try {
          const currentUser = await AuthService.getCurrentUser();
          
          if (!isMounted) return;
          
          console.log('AuthContext: Got current user:', currentUser ? {
            id: currentUser.id,
            email: currentUser.email,
            has_profile: !!currentUser.profile
          } : null);
          
          setUser(currentUser);
          setIsLoading(false);
        } catch (error) {
          console.error(`AuthContext: Error initializing auth (attempt ${attempt}):`, error);
          
          // Retry on network errors
          if (attempt < MAX_RETRIES) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isNetworkError = 
              errorMessage.toLowerCase().includes('fetch') ||
              errorMessage.toLowerCase().includes('network') ||
              errorMessage.toLowerCase().includes('connection');
            
            if (isNetworkError) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              return attemptInit(attempt + 1);
            }
          }
          
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      attemptInit(1);
      
      // Listen for storage events (cross-tab synchronization)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'auth_state_changed' && e.newValue) {
          try {
            const authEvent = JSON.parse(e.newValue);
            if (authEvent.type === 'SIGNED_IN' || authEvent.type === 'SIGNED_OUT') {
              console.log('AuthContext: Auth state changed in another tab, refreshing...');
              // Refresh user state when auth changes in another tab
              AuthService.getCurrentUser().then(user => {
                if (isMounted) {
                  setUser(user);
                }
              }).catch(err => {
                console.warn('AuthContext: Error refreshing after storage event:', err);
              });
            }
          } catch (err) {
            console.warn('AuthContext: Error parsing storage event:', err);
          }
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        isMounted = false;
        window.removeEventListener('storage', handleStorageChange);
      };
    };

    initializeAuth();

    // Listen for auth changes - MIDDLEWARE HANDLES ROUTING
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state change', { 
        event, 
        user_id: session?.user?.id,
        session_exists: !!session,
        email_confirmed_at: session?.user?.email_confirmed_at
      });
      
      // Broadcast auth state change to other tabs
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('auth_state_changed', JSON.stringify({
            type: event,
            timestamp: Date.now(),
            user_id: session?.user?.id
          }));
          // Remove the item after a short delay to allow other tabs to pick it up
          setTimeout(() => {
            localStorage.removeItem('auth_state_changed');
          }, 100);
        } catch (err) {
          // Ignore localStorage errors (private browsing, etc.)
          console.warn('AuthContext: Could not broadcast auth state change:', err);
        }
      }
      
      // Optimize for email verification events - update immediately if email is confirmed
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        // Fast path: if email is confirmed in session, optimistically update user
        try {
          const currentUser = await AuthService.getCurrentUser();
          if (currentUser) {
            console.log('AuthContext: Email verified - fast update', {
              email: currentUser.email,
              email_verified: currentUser.email_verified
            });
            setUser(currentUser);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.warn('AuthContext: Error getting user after sign in:', error);
          // Continue with normal flow
        }
      }
      
      // Handle token refresh events
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        try {
          const currentUser = await AuthService.getCurrentUser();
          if (currentUser) {
            console.log('AuthContext: Token refreshed, updating user state');
            setUser(currentUser);
          }
        } catch (error) {
          console.warn('AuthContext: Error getting user after token refresh:', error);
        }
        return;
      }
      
      // Only update user state - middleware handles all routing logic
      if (session?.user) {
        try {
          const currentUser = await AuthService.getCurrentUser();
          console.log('AuthContext: User state updated', {
            email: currentUser?.email,
            email_verified: currentUser?.email_verified,
            user_id: currentUser?.id
          });
          setUser(currentUser);
          setIsLoading(false);
        } catch (error) {
          console.warn('AuthContext: Error getting user from session:', error);
          // Retry once on error
          try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const retryUser = await AuthService.getCurrentUser();
            setUser(retryUser);
          } catch (retryError) {
            console.warn('AuthContext: Retry failed, clearing user state:', retryError);
            // If retry fails, clear the state
            setUser(null);
          }
          setIsLoading(false);
        }
      } else {
        console.log('AuthContext: User signed out');
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { user: authUser, error: authError } = await AuthService.signIn({ email, password });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return false;
      }

      if (authUser) {
        setUser(authUser);

        // Clear rate limit on successful login
        try {
          await RateLimiter.recordSuccess(email.trim().toLowerCase(), 'login');
        } catch (rateLimitError) {
          console.error('Error clearing rate limit:', rateLimitError);
          // Don't fail login if rate limit clearing fails
        }

        // Redirect based on onboarding status and email verification
        if (!authUser.email_verified) {
          // Redirect to email verification if not verified
          router.push('/verify-email');
        } else if (authUser.profile?.onboarding_complete) {
          // User has completed onboarding, redirect to home
          router.push('/home');
        } else {
          // User is verified but onboarding incomplete - redirect to next step
          // Determine next step based on what's been completed
          const interestsCount = authUser.profile?.interests_count || 0;
          const subcategoriesCount = authUser.profile?.subcategories_count || 0;
          const dealbreakersCount = authUser.profile?.dealbreakers_count || 0;
          
          let nextStep = 'interests';
          if (interestsCount === 0) {
            nextStep = 'interests';
          } else if (subcategoriesCount === 0) {
            nextStep = 'subcategories';
          } else if (dealbreakersCount === 0) {
            nextStep = 'deal-breakers';
          } else {
            nextStep = 'complete';
          }
          
          router.push(`/${nextStep}`);
        }
      }

      setIsLoading(false);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setError(message);
      setIsLoading(false);
      return false;
    }
  };

    const register = async (email: string, password: string, username: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('AuthContext: Starting registration...');
        
        const { user: authUser, session, error: authError } = await AuthService.signUp({ email, password, username });

        if (authError) {
          console.log('AuthContext: Registration error', authError);
          // Handle specific error cases
          let errorMessage = authError.message;
          // Check for email already in use - check both code and message
          if (
            authError.code === 'user_exists' ||
            authError.message.toLowerCase().includes('already in use') ||
            authError.message.toLowerCase().includes('already registered') ||
            authError.message.toLowerCase().includes('email already') ||
            authError.message.toLowerCase().includes('already exists')
          ) {
            errorMessage = 'This email address is already in use. Please try logging in instead or use a different email.';
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

          // Clear rate limit on successful registration
          try {
            await RateLimiter.recordSuccess(email.trim().toLowerCase(), 'register');
          } catch (rateLimitError) {
            console.error('Error clearing rate limit:', rateLimitError);
            // Don't fail registration if rate limit clearing fails
          }

          // Set user state - this will trigger auth state change
          setUser(authUser);

          // Store email in sessionStorage for verify-email page (in case AuthContext state is lost)
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('pendingVerificationEmail', authUser.email);
          }

          // Redirect to verify-email page since user won't have a session until email is verified
          console.log('AuthContext: Registration complete, redirecting to verify-email');
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

    try {
      const { error: signOutError } = await AuthService.signOut();

      if (signOutError) {
        setError(signOutError.message);
      } else {
        setUser(null);
        router.push('/onboarding');
      }
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
      const { data: freshProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('user_id, onboarding_step, interests_count, last_interests_updated, created_at, updated_at, avatar_url, username, display_name, is_top_reviewer, reviews_count, badges_count, subcategories_count, dealbreakers_count')
        .eq('user_id', user.id)
        .single();

      // Transform fresh profile data to match the profile structure
      let transformedProfile = null;
      
      if (freshProfile) {
        // Use fresh data from database (most accurate)
        transformedProfile = {
          id: freshProfile.user_id,
          onboarding_step: freshProfile.onboarding_step,
          onboarding_complete: freshProfile.onboarding_step === 'complete',
          interests_count: freshProfile.interests_count || 0,
          last_interests_updated: freshProfile.last_interests_updated,
          avatar_url: freshProfile.avatar_url || undefined,
          username: freshProfile.username || undefined,
          display_name: freshProfile.display_name || undefined,
          locale: 'en', // Default locale - locale column doesn't exist in profiles table
          is_top_reviewer: freshProfile.is_top_reviewer || false,
          reviews_count: freshProfile.reviews_count || 0,
          badges_count: freshProfile.badges_count || 0,
          subcategories_count: freshProfile.subcategories_count || 0,
          dealbreakers_count: freshProfile.dealbreakers_count || 0,
          created_at: freshProfile.created_at,
          updated_at: freshProfile.updated_at
        };
      } else if (fetchError) {
        // If fetch failed but update succeeded, use the data we tried to save
        // Merge userData.profile with existing profile to preserve all fields
        console.warn('Failed to fetch fresh profile after update, using provided data:', fetchError);
        if (userData.profile) {
          transformedProfile = {
            ...user.profile,
            ...userData.profile,
            // Ensure username and display_name are properly set (null if empty)
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
      }

      // Update local user state with fresh data from database or provided data
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

  const resendVerificationEmail = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await AuthService.resendVerificationEmail(email);
      
      if (error) {
        setError(error.message);
        return false;
      }

      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to resend verification email';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { AuthUser };
