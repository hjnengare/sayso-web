"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { ONBOARDING_STEPS } from "../contexts/onboarding-steps";
import { PageLoader } from "./Loader";

// Simple loading component
const PageLoading = () => <PageLoader size="lg" variant="wavy" color="sage" />;

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Memoize expensive calculations
  const isOnboardingRoute = useMemo(() =>
    ONBOARDING_STEPS.some(step => pathname === step.path || pathname.startsWith(step.path)),
    [pathname]
  );

  // Protected routes that require authentication (matches middleware)
  const protectedRoutes = useMemo(() => [
    '/interests', '/subcategories', '/deal-breakers', '/complete', 
    '/home', '/profile', '/reviews', '/write-review', '/leaderboard', 
    '/saved', '/dm', '/reviewer', '/explore', '/for-you', '/trending',
    '/events-specials', '/business', '/event', '/special'
  ], []);

  const isProtectedRoute = useMemo(() =>
    protectedRoutes.some(route => pathname === route || pathname.startsWith(route + '/')),
    [pathname, protectedRoutes]
  );

  // Public routes that don't require authentication
  const publicRoutes = useMemo(() => [
    '/onboarding', '/register', '/login', '/verify-email', 
    '/forgot-password', '/reset-password', '/auth/callback',
    '/business/login', '/business/verification-status'
  ], []);

  const isPublicRoute = useMemo(() =>
    publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/')),
    [pathname, publicRoutes]
  );

  // Simplified navigation logic - let middleware handle strict step enforcement
  // This guard only handles basic auth/verification checks to avoid blocking legitimate progression
  const handleNavigation = useCallback(() => {
    if (isLoading) return;

    // CRITICAL: Block unauthenticated users from accessing protected routes
    if (isProtectedRoute && !isPublicRoute && !user) {
      console.log('OnboardingGuard: Unauthenticated user trying to access protected route, redirecting to onboarding');
      router.replace('/onboarding');
      return;
    }

    // Skip guard for public routes (unless they're onboarding routes that need special handling)
    if (isPublicRoute && !isOnboardingRoute) return;

    // If user is already onboarded and trying to access ANY onboarding route, redirect to home
    // EXCEPT for the complete page, which should be allowed as the final step
    if (user?.profile?.onboarding_complete && pathname !== "/complete") {
      router.replace("/home");
      return;
    }

    // If no user and trying to access protected steps, redirect to start
    if (!user && pathname !== "/onboarding" && pathname !== "/register" && pathname !== "/login") {
      router.replace("/onboarding");
      return;
    }

    // For protected onboarding steps, check email verification
    // Note: We don't check step prerequisites here because:
    // 1. Middleware handles strict step-by-step enforcement with fresh DB data
    // 2. Client-side state is stale (data saves async, user state updates async)
    // 3. Pages themselves handle showing appropriate UI if data isn't ready
    const protectedSteps = ["/interests", "/subcategories", "/deal-breakers", "/complete"];
    if (user && protectedSteps.includes(pathname) && !user.email_verified) {
      router.replace("/verify-email");
      return;
    }

    // Allow navigation - middleware will handle step enforcement
    // This prevents the guard from blocking legitimate progression due to stale client state
  }, [user, isLoading, pathname, router, isOnboardingRoute, isProtectedRoute, isPublicRoute]);

  useEffect(() => {
    handleNavigation();
  }, [handleNavigation]);

  // Show loading while checking auth
  if (isLoading) {
    return <PageLoading />;
  }

  return <>{children}</>;
}
