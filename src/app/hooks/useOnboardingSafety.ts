/**
 * useOnboardingSafety Hook
 * Provides safety utilities for onboarding operations:
 * - Unmount detection
 * - Network timeout handling
 * - Double submission prevention
 * - Session validation
 */

import { useRef, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api/apiClient';

interface UseOnboardingSafetyOptions {
  timeout?: number; // Network timeout in ms (default: 30000)
  preventDoubleSubmit?: boolean; // Prevent rapid clicks (default: true)
  checkSessionOnMount?: boolean; // Check session validity on mount (default: false - changed default)
}

interface UseOnboardingSafetyReturn {
  isMounted: () => boolean;
  createAbortController: () => AbortController;
  withTimeout: <T>(promise: Promise<T>, timeout?: number) => Promise<T>;
  preventDoubleSubmit: <T extends (...args: any[]) => Promise<any>>(
    fn: T
  ) => T;
  checkSession: () => Promise<boolean>;
  handleBeforeUnload: (isSaving: boolean) => void;
}

export function useOnboardingSafety(
  options: UseOnboardingSafetyOptions = {}
): UseOnboardingSafetyReturn {
  const {
    timeout = 30000,
    preventDoubleSubmit: enablePreventDoubleSubmit = true,
    checkSessionOnMount = false, // Changed default to false
  } = options;

  const isMountedRef = useRef(true);
  const isSubmittingRef = useRef(false);
  const hasCheckedSessionRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const userId = user?.id ?? null; // Stable primitive

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check session ONCE per route change (not on every user object change)
  useEffect(() => {
    if (!checkSessionOnMount || !userId) {
      return;
    }

    // Only check if we haven't checked for this route yet
    if (hasCheckedSessionRef.current) {
      return;
    }

    hasCheckedSessionRef.current = true;

    // Reset on route change
    const checkSessionOnce = async () => {
      try {
        await apiClient.fetch(
          '/api/user/onboarding',
          {
            method: 'GET',
            signal: AbortSignal.timeout(10000), // Increased to 10s
          },
          {
            useCache: false,
          }
        );
      } catch (error: any) {
        const errorMessage = error?.message || '';

        if (errorMessage.includes('401')) {
          console.warn('[useOnboardingSafety] Session expired');
          router.replace('/login');
        } else if (error.name !== 'AbortError' && !errorMessage.includes('timeout')) {
          console.warn('[useOnboardingSafety] Session check failed:', errorMessage);
        }
      }
    };

    checkSessionOnce();

    // Reset check flag when route changes
    return () => {
      hasCheckedSessionRef.current = false;
    };
  }, [pathname, userId, checkSessionOnMount, router]); // ✅ Only pathname and userId (stable)

  // Safe state setter (only if mounted)
  const isMounted = useCallback(() => {
    return isMountedRef.current;
  }, []);

  // Create abort controller for network requests
  const createAbortController = useCallback(() => {
    return new AbortController();
  }, []);

  // Wrap promise with timeout
  const withTimeout = useCallback(
    async <T,>(promise: Promise<T>, customTimeout?: number): Promise<T> => {
      const timeoutMs = customTimeout || timeout;
      const controller = new AbortController();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          controller.abort();
          reject(new Error(`Request timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      return Promise.race([promise, timeoutPromise]);
    },
    [timeout]
  );

  // Prevent double submission
  const preventDoubleSubmit = useCallback(
    <T extends (...args: any[]) => Promise<any>>(fn: T): T => {
      if (!enablePreventDoubleSubmit) {
        return fn;
      }

      return ((...args: any[]) => {
        if (isSubmittingRef.current) {
          console.warn('[useOnboardingSafety] Submission already in progress, ignoring');
          return Promise.reject(new Error('Submission already in progress'));
        }

        isSubmittingRef.current = true;

        return Promise.resolve(fn(...args))
          .finally(() => {
            // Reset after a short delay to prevent rapid re-submission
            setTimeout(() => {
              isSubmittingRef.current = false;
            }, 1000);
          });
      }) as T;
    },
    [enablePreventDoubleSubmit]
  );

  // Check session validity (manual call only, not automatic)
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      if (!userId) {
        return false;
      }

      // Check if session is still valid by making a lightweight API call
      try {
        await apiClient.fetch(
          '/api/user/onboarding',
          {
            method: 'GET',
            signal: AbortSignal.timeout(10000), // 10s timeout
          },
          {
            useCache: false, // Don't cache session checks
          }
        );

        return true;
      } catch (fetchError: any) {
        const errorMessage = fetchError?.message || '';

        if (errorMessage.includes('401')) {
          console.warn('[useOnboardingSafety] Session expired');
          router.replace('/login');
          return false;
        }

        if (fetchError.name === 'AbortError' || errorMessage.includes('timeout')) {
          console.warn('[useOnboardingSafety] Session check timed out');
          return false;
        }

        console.warn('[useOnboardingSafety] Session check failed:', errorMessage);
        return false;
      }
    } catch (error: any) {
      console.error('[useOnboardingSafety] Session check error:', error);
      return false;
    }
  }, [userId, router]);

  // Handle beforeunload warning
  const handleBeforeUnload = useCallback(
    (isSaving: boolean): (() => void) | undefined => {
      if (!isSaving) return;

      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handler);

      return () => {
        window.removeEventListener('beforeunload', handler);
      };
    },
    []
  );

  return {
    isMounted,
    createAbortController,
    withTimeout,
    preventDoubleSubmit,
    checkSession,
    handleBeforeUnload,
  };
}
