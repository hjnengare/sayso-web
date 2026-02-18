/**
 * Route prefetching hook for instant navigation
 * Prefetches critical routes on mount to make navigation feel instant
 */

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const CRITICAL_ROUTES = [
  '/trending',
  '/for-you',
  '/leaderboard',
  '/events-specials',
  '/saved',
  '/profile',
  '/home',
] as const;

export function usePrefetchRoutes() {
  const router = useRouter();

  useEffect(() => {
    // Prefetch critical routes after initial render
    const prefetchTimer = setTimeout(() => {
      CRITICAL_ROUTES.forEach((route) => {
        router.prefetch(route);
      });
    }, 100); // Small delay to not block initial render

    return () => clearTimeout(prefetchTimer);
  }, [router]);
}

/**
 * Prefetch a specific route on hover for instant navigation
 */
export function usePrefetchOnHover(route: string) {
  const router = useRouter();

  const prefetch = () => {
    router.prefetch(route);
  };

  return prefetch;
}
