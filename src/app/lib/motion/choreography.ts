/**
 * Choreography primitives for element-level page entry and refresh animations.
 * Preset: "balanced premium"
 *
 * Guardrails (non-negotiable):
 * - No full-page/container transitions.
 * - No blur in default entry.
 * - Reduced motion: all entry choreography disabled.
 * - Stagger gap: 45ms. Max animated per batch: 10.
 */

export type ChoreoIntent =
  | "hero"
  | "heading"
  | "section"
  | "sidebar"
  | "listItem"
  | "inline";

export type ChoreoPreset = "balanced";

// Duration in ms per intent level
const DURATIONS_MS: Record<ChoreoIntent, number> = {
  hero: 300,
  heading: 300,
  section: 240,
  sidebar: 240,
  listItem: 200,
  inline: 180,
};

const STAGGER_GAP_MS = 45;
const MAX_ANIMATED = 10;
const EASE = [0.22, 1, 0.36, 1] as const;
const TRANSLATE_Y_PX = 10;

/**
 * Returns framer-motion props for a choreographed page-entry item.
 *
 * Spread the result directly onto an `<m.div>` (or any motion element).
 * When `enabled` is false (reduced motion or disabled), returns an empty
 * object so the element renders without any animation overhead.
 *
 * @example
 * <m.div {...getChoreoItemMotion({ order: 1, intent: 'section', enabled: !prefersReducedMotion })}>
 */
export function getChoreoItemMotion({
  order,
  intent,
  enabled,
  delayOffsetMs = 0,
}: {
  order: number;
  intent: ChoreoIntent;
  enabled: boolean;
  delayOffsetMs?: number;
}) {
  if (!enabled) return {};

  const cappedOrder = Math.min(order, MAX_ANIMATED - 1);
  const delayMs = cappedOrder * STAGGER_GAP_MS + delayOffsetMs;
  const durationMs = DURATIONS_MS[intent];

  return {
    initial: { opacity: 0, y: TRANSLATE_Y_PX },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: durationMs / 1000,
      ease: EASE,
      delay: delayMs / 1000,
    },
  } as const;
}

/**
 * Returns true when choreography should be disabled (i.e. reduced motion is active).
 * Convenience wrapper for consistent naming across consumers.
 */
export function getReducedMotionSafe(prefersReducedMotion: boolean): boolean {
  return prefersReducedMotion;
}
