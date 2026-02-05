"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";

interface OptimizedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  [key: string]: any;
}

export default function OptimizedLink({ 
  href, 
  children, 
  className, 
  prefetch = true,
  onClick,
  ...props 
}: OptimizedLinkProps) {
  const router = useRouter();
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleCallbackRef = useRef<number | null>(null);
  const target = (props as { target?: string } | undefined)?.target;

  const shouldPrefetch = useMemo(() => {
    if (!prefetch) return false;

    if (typeof navigator === "undefined") return prefetch;
    const connection = (navigator as any).connection as
      | { saveData?: boolean; effectiveType?: string }
      | undefined;

    if (connection?.saveData) return false;
    const effectiveType = connection?.effectiveType ?? "";
    if (effectiveType.includes("2g")) return false;

    return true;
  }, [prefetch]);

  // Prefetch on hover with debouncing
  const schedulePrefetch = useCallback(() => {
    if (!shouldPrefetch) return;
    if (!href.startsWith("/")) return;

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const g = globalThis as any;
    if (idleCallbackRef.current && typeof g.cancelIdleCallback === "function") {
      g.cancelIdleCallback(idleCallbackRef.current);
      idleCallbackRef.current = null;
    }

    // Debounce a little so quick fly-overs don't spam prefetches.
    hoverTimeoutRef.current = setTimeout(() => {
      if (typeof g.requestIdleCallback === "function") {
        idleCallbackRef.current = g.requestIdleCallback(
          () => router.prefetch(href),
          { timeout: 1000 },
        );
      } else {
        router.prefetch(href);
      }
    }, 75);
  }, [href, router, shouldPrefetch]);

  const cancelPrefetch = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const g = globalThis as any;
    if (idleCallbackRef.current && typeof g.cancelIdleCallback === "function") {
      g.cancelIdleCallback(idleCallbackRef.current);
      idleCallbackRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelPrefetch();
    };
  }, [cancelPrefetch]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;

      // Respect modified clicks (new tab/window, downloads, etc).
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (target === "_blank") return;
      if (!href.startsWith("/")) return;

      const startViewTransition = (document as any)?.startViewTransition as
        | undefined
        | ((callback: () => void) => void);

      if (!startViewTransition) return;

      e.preventDefault();
      startViewTransition(() => {
        router.push(href);
      });
    },
    [href, onClick, router, target],
  );

  return (
    <Link
      href={href}
      className={[className, "mi-tap"].filter(Boolean).join(" ")}
      prefetch={prefetch}
      onPointerEnter={schedulePrefetch}
      onFocus={schedulePrefetch}
      onPointerLeave={cancelPrefetch}
      onBlur={cancelPrefetch}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
}
