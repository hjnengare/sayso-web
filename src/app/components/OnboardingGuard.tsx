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
    // Onboarding routes
    '/interests', '/subcategories', '/deal-breakers', '/complete',
    // Main app routes
    '/home', '/profile', '/saved', '/dm', '/reviewer',
    // Content discovery routes
    '/explore', '/for-you', '/trending', '/events-specials',
    // Review routes
    '/write-review', '/reviews',
    // Leaderboard
    '/leaderboard',
    // Event and special routes
    '/event', '/special',
    // User action routes
    '/notifications', '/add-business', '/claim-business',
    // Business review routes (business viewing is public, but review/edit need auth)
    // Note: We check for /business/[id]/review pattern in the route matching
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

  // Simplified navigation logic - minimal checks, let middleware and pages handle validation
  const handleNavigation = useCallback(() => {
    if (isLoading) return;

    // CRITICAL: Block unauthenticated users from accessing protected routes
    if (isProtectedRoute && !isPublicRoute && !user) {
      console.log('OnboardingGuard: Unauthenticated user trying to access protected route, redirecting to onboarding');
      router.replace('/onboarding');
      return;
    }

    // Skip guard for public routes
    if (isPublicRoute && !isOnboardingRoute) return;

    // If user is already onboarded and trying to access ANY onboarding route, redirect to home
    // EXCEPT for the complete page, which should be allowed as the final step
    if (user?.profile?.onboarding_complete && pathname !== "/complete") {
      router.replace("/home");
      return;
    }

    // For protected onboarding steps, check email verification
    const protectedSteps = ["/interests", "/subcategories", "/deal-breakers", "/complete"];
    if (user && protectedSteps.includes(pathname) && !user.email_verified) {
      router.replace("/verify-email");
      return;
    }

    // Allow navigation - middleware and pages handle validation
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
