"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Critical routes to prefetch
const CRITICAL_ROUTES = [
  "/home",
  "/saved", 
  "/leaderboard",
  "/profile",
  "/for-businesses"
];

export default function LinkPrefetch() {
  const router = useRouter();

  useEffect(() => {
    // Prefetch critical routes after initial load
    const prefetchRoutes = () => {
      CRITICAL_ROUTES.forEach(route => {
        router.prefetch(route);
      });
    };

    // Prefetch after a short delay to not block initial render
    const timer = setTimeout(prefetchRoutes, 1000);
    
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
