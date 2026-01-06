"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { ONBOARDING_STEPS } from "../contexts/onboarding-steps";
import { PageLoader } from "./Loader";
import { getBrowserSupabase } from "@/app/lib/supabase/client";

const PageLoading = () => <PageLoader size="lg" variant="wavy" color="sage" />;

interface OnboardingGuardProps {
  children: React.ReactNode;
}

type ProfileLite = {
  onboarding_step: string | null;
  onboarding_complete: boolean | null;
  interests_count: number | null;
  subcategories_count: number | null;
  dealbreakers_count: number | null;
};

export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const supabase = useMemo(() => getBrowserSupabase(), []);

  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const isOnboardingRoute = useMemo(
    () => ONBOARDING_STEPS.some(step => pathname === step.path || pathname.startsWith(step.path)),
    [pathname]
  );

  // ✅ Same logic as middleware: onboarding_step is primary, counts are fallback
  const getNextOnboardingStep = useCallback((p: ProfileLite | null): string => {
    if (!p) return "interests";

    const currentStep = p.onboarding_step || null;

    if (p.onboarding_complete && currentStep === "complete") return "complete";

    if (currentStep) {
      const stepMap: Record<string, string> = {
        interests: "subcategories",
        subcategories: "deal-breakers",
        "deal-breakers": "complete",
        complete: "complete",
      };
      if (stepMap[currentStep]) return stepMap[currentStep];
    }

    // fallback
    const interestsCount = p.interests_count || 0;
    const subcategoriesCount = p.subcategories_count || 0;
    const dealbreakersCount = p.dealbreakers_count || 0;

    if (interestsCount === 0) return "interests";
    if (subcategoriesCount === 0) return "subcategories";
    if (dealbreakersCount === 0) return "deal-breakers";
    return "complete";
  }, []);

  // ✅ Fetch a fresh lightweight profile whenever user/path changes inside onboarding
  useEffect(() => {
    if (!user || !isOnboardingRoute) return;

    let cancelled = false;

    (async () => {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_step,onboarding_complete,interests_count,subcategories_count,dealbreakers_count")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled) {
        setProfile(error ? null : (data as ProfileLite | null));
        setProfileLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, pathname, isOnboardingRoute, supabase]);

  const handleNavigation = useCallback(() => {
    if (isLoading) return;
    if (!isOnboardingRoute) return;

    // unauth user
    if (!user && pathname !== "/onboarding" && pathname !== "/register" && pathname !== "/login") {
      router.replace("/onboarding");
      return;
    }
    if (!user) return;

    // email check
    if (!user.email_verified) {
      router.replace("/verify-email");
      return;
    }

    // IMPORTANT: wait for fresh profile so we don't bounce based on stale counts
    if (profileLoading) return;

    // Allow /complete page access (same as your intent)
    if (pathname === "/complete") {
      const next = getNextOnboardingStep(profile);
      if (next !== "complete") router.replace(`/${next}`);
      return;
    }

    // If completed, send to home
    if (profile?.onboarding_complete) {
      router.replace("/home");
      return;
    }

    // Enforce "don't skip ahead" using fresh profile (not user.profile)
    const nextStep = getNextOnboardingStep(profile);

    const stepOrder = ["interests", "subcategories", "deal-breakers", "complete"];
    const pathToStep: Record<string, string> = {
      "/interests": "interests",
      "/subcategories": "subcategories",
      "/deal-breakers": "deal-breakers",
      "/complete": "complete",
    };

    const current = pathToStep[pathname] || "interests";

    // Only block skipping AHEAD (your original behavior)
    if (stepOrder.indexOf(current) > stepOrder.indexOf(nextStep)) {
      router.replace(`/${nextStep}`);
      return;
    }
  }, [isLoading, isOnboardingRoute, user, pathname, router, profile, profileLoading, getNextOnboardingStep]);

  useEffect(() => {
    handleNavigation();
  }, [handleNavigation]);

  if (isLoading || (isOnboardingRoute && user && profileLoading)) {
    return <PageLoading />;
  }

  return <>{children}</>;
}
