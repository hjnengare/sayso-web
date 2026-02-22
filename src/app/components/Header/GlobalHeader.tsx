"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";

const EXCLUDED_ROUTES = [
  "/login",
  "/register",
  "/onboarding",
  "/interests",
  "/subcategories",
  "/deal-breakers",
  "/complete",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/privacy",
  "/terms",
  // Portal routes — have their own sidebar + mobile topbar
  "/my-businesses",
  "/add-business",
  "/add-event",
  "/add-special",
  "/claim-business",
  "/notifications",
  "/settings",
  "/admin",
];

export default function GlobalHeader() {
  const pathname = usePathname();

  const shouldHide = useMemo(() => {
    if (!pathname) return false;
    return EXCLUDED_ROUTES.some(route => pathname === route || pathname.startsWith(route + "/"));
  }, [pathname]);

  if (shouldHide) return null;

  return (
    <Header
      showSearch={true}
      variant="white"
      backgroundClassName="bg-navbar-bg"
      topPosition="top-0"
      reducedPadding={true}
      whiteText={true}
    />
  );
}
