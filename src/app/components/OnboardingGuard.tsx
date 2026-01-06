"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { ONBOARDING_STEPS, OnboardingStep } from "../contexts/onboarding-steps";
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

  const currentStep = useMemo(() =>
    ONBOARDING_STEPS.find(step => pathname === step.path),
    [pathname]
  );

  // Helper function to determine next incomplete onboarding step
  const getNextOnboardingStep = useCallback((profile: any): string => {
    if (profile?.onboarding_complete && profile?.onboarding_step === 'complete') {
      return 'complete';
    }

    const interestsCount = profile?.interests_count || 0;
    const subcategoriesCount = profile?.subcategories_count || 0;
    const dealbreakersCount = profile?.dealbreakers_count || 0;

    if (interestsCount === 0) {
      return 'interests';
    } else if (subcategoriesCount === 0) {
      return 'subcategories';
    } else if (dealbreakersCount === 0) {
      return 'deal-breakers';
    } else {
      return 'complete';
    }
  }, []);

  // Enforce mandatory onboarding flow with step order
  const handleNavigation = useCallback(() => {
    if (isLoading) return;

    // Skip guard for non-onboarding routes
    if (!isOnboardingRoute) return;

    // If no user and trying to access protected steps, redirect to start
    if (!user && pathname !== "/onboarding" && pathname !== "/register" && pathname !== "/login") {
      router.replace("/onboarding");
      return;
    }

    if (!user) return;

    // Check email verification first - all onboarding steps require verified email
    if (!user.email_verified) {
      router.replace("/verify-email");
      return;
    }

    // CRITICAL: Always allow access to /complete page if prerequisites are met
    // This must be checked BEFORE the "redirect if completed" check
    // IMPORTANT: Even if onboarding_complete is true, allow access to /complete
    // This prevents redirect loops where middleware sends user to /complete but OnboardingGuard redirects away
    if (pathname === "/complete") {
      const interestsCount = user.profile?.interests_count || 0;
      const subcategoriesCount = user.profile?.subcategories_count || 0;
      // Allow access to complete page if user has completed interests and subcategories
      // Even if onboarding_complete is true, we want to show the celebration page
      if (interestsCount === 0 || subcategoriesCount === 0) {
        const nextStep = getNextOnboardingStep(user.profile);
        router.replace(`/${nextStep}`);
        return;
      }
      // User has completed prerequisites, allow them to see complete page
      // This allows the page to show even if onboarding_complete is already true
      // DO NOT redirect away from /complete - this prevents infinite loops
      return;
    }

    // If user has completed onboarding, redirect to home (but not if they're on /complete, which is handled above)
    // CRITICAL: This check must come AFTER the /complete check to prevent redirect loops
    if (user.profile?.onboarding_complete && pathname !== "/complete") {
      router.replace("/home");
      return;
    }

    // Determine the next step user should be on
    const nextStep = getNextOnboardingStep(user.profile);
    const stepOrder = ['interests', 'subcategories', 'deal-breakers', 'complete'];
    const pathToStep: { [key: string]: string } = {
      '/interests': 'interests',
      '/subcategories': 'subcategories',
      '/deal-breakers': 'deal-breakers',
      '/complete': 'complete'
    };

    const currentStep = pathToStep[pathname] || 'interests';
    const nextStepIndex = stepOrder.indexOf(nextStep);
    const currentStepIndex = stepOrder.indexOf(currentStep);

    // If user is trying to access a step ahead of where they should be, redirect to correct step
    if (currentStepIndex > nextStepIndex) {
      console.log('OnboardingGuard: User trying to skip steps, redirecting to:', nextStep);
      router.replace(`/${nextStep}`);
      return;
    }

    // Enforce prerequisites for each step
    if (pathname === "/subcategories") {
      const interestsCount = user.profile?.interests_count || 0;
      if (interestsCount === 0) {
        router.replace("/interests");
        return;
      }
    }

    if (pathname === "/deal-breakers") {
      const interestsCount = user.profile?.interests_count || 0;
      const subcategoriesCount = user.profile?.subcategories_count || 0;
      if (interestsCount === 0) {
        router.replace("/interests");
        return;
      }
      if (subcategoriesCount === 0) {
        router.replace("/subcategories");
        return;
      }
    }
  }, [user, isLoading, pathname, router, isOnboardingRoute, getNextOnboardingStep]);

  useEffect(() => {
    handleNavigation();
  }, [handleNavigation]);

  // Show loading while checking auth
  if (isLoading) {
    return <PageLoading />;
  }

  return <>{children}</>;
}
