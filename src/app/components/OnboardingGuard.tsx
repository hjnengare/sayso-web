"use client";

import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { PageLoader } from "./Loader";

const PageLoading = () => <PageLoader size="lg" variant="wavy" color="sage" />;

interface OnboardingGuardProps {
  children: React.ReactNode;
}

/**
 * SIMPLIFIED OnboardingGuard
 * 
 * Trust middleware for all routing decisions - it's the single source of truth.
 * This component only handles loading states during auth initialization.
 * 
 * All onboarding routing logic is handled by:
 * - Middleware (server-side, single source of truth)
 * - getOnboardingAccess helper (state machine logic)
 * 
 * No duplicate routing checks here - that causes race conditions and bugs.
 */
export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { isLoading } = useAuth();

  // Only show loading during initial auth check
  // Middleware handles all routing, so we don't need to duplicate that logic
  if (isLoading) {
    return <PageLoading />;
  }

  return <>{children}</>;
}
