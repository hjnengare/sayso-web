/**
 * Mobile-first motion policy primitives for top-traffic surfaces.
 * Viewport-first enforcement: mobile is any viewport < 768px.
 */

export const MOBILE_BREAKPOINT_PX = 768;
export const EASE_PREMIUM = [0.22, 1, 0.36, 1] as const;

const MOBILE_MAX_STAGGER_ITEMS = 6;
const MOBILE_STAGGER_GAP_MS = 20;
const MOBILE_DURATION_MIN_MS = 160;
const MOBILE_DURATION_MAX_MS = 220;

export function isMobileViewport(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches;
}

export function getMobileSafeContainerMotion(enabled: boolean) {
  if (!enabled || !isMobileViewport()) return {};

  return {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    transition: {
      staggerChildren: MOBILE_STAGGER_GAP_MS / 1000,
      delayChildren: 0,
    },
  } as const;
}

export function getMobileSafeItemMotion(index: number, enabled: boolean) {
  if (!enabled || !isMobileViewport()) return {};

  const safeIndex = Number.isFinite(index) ? Math.max(0, index) : 0;
  const cappedIndex = Math.min(safeIndex, MOBILE_MAX_STAGGER_ITEMS - 1);
  const durationMs = Math.min(
    MOBILE_DURATION_MAX_MS,
    MOBILE_DURATION_MIN_MS + cappedIndex * 12
  );
  const translateYPx = Math.min(10, 6 + cappedIndex);

  return {
    initial: { opacity: 0, y: translateYPx },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: durationMs / 1000,
      delay: (cappedIndex * MOBILE_STAGGER_GAP_MS) / 1000,
      ease: EASE_PREMIUM,
    },
  } as const;
}
