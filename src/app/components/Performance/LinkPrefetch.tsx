"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Critical routes to prefetch
const CRITICAL_ROUTES = [
  "/home",
  "/saved", 
  "/leaderboard",
  "/profile",
  "/claim-business"
];

export default function LinkPrefetch() {
  const router = useRouter();

  useEffect(() => {
    const g = globalThis as any;

    const connection = (navigator as any).connection as
      | { saveData?: boolean; effectiveType?: string }
      | undefined;

    if (connection?.saveData) return;
    const effectiveType = connection?.effectiveType ?? "";
    if (effectiveType.includes("2g")) return;

    // Prefetch critical routes after initial load
    const prefetchRoutes = () => {
      CRITICAL_ROUTES.forEach(route => {
        router.prefetch(route);
      });
    };

    // Prefetch during idle time to avoid competing with initial render/hydration.
    let idleId: number | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    if (typeof g.requestIdleCallback === "function") {
      idleId = g.requestIdleCallback(prefetchRoutes, { timeout: 2500 });
    } else {
      timerId = setTimeout(prefetchRoutes, 1500);
    }

    return () => {
      if (idleId && typeof g.cancelIdleCallback === "function") {
        g.cancelIdleCallback(idleId);
      }
      if (timerId) clearTimeout(timerId);
    };
  }, [router]);

  return null;
}
