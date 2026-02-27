/**
 * Badge celebration helper — fires brand-palette confetti when a badge is awarded.
 * Dedupes by key so the same event cannot fire more than once per session.
 */

const firedKeys = new Set<string>();

/**
 * Fire a celebratory confetti burst for a badge award.
 *
 * @param key  A unique string for this award event. Calls with the same key
 *             are silently ignored (dedupe guard).
 */
export async function fireBadgeCelebration(key: string): Promise<void> {
  if (firedKeys.has(key)) return;
  firedKeys.add(key);

  if (typeof window === "undefined") return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) return;

  try {
    const { default: confetti } = await import("canvas-confetti");
    // Brand palette: sage, coral/navbar-bg, white, gold accent
    const colors = ["#7D9B76", "#722F37", "#FFFFFF", "#FFD700"];
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 }, colors, zIndex: 9999 });
    confetti({ particleCount: 30, angle: 60, spread: 55, origin: { x: 0.2, y: 0.8 }, colors, zIndex: 9999 });
    confetti({ particleCount: 30, angle: 120, spread: 55, origin: { x: 0.8, y: 0.8 }, colors, zIndex: 9999 });
  } catch {
    // canvas-confetti unavailable — silently skip
  }
}
