/** Normalize a string for dedup key building: trim + lowercase. */
export function normalizeText(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Build a dedupe key for in-memory consolidation.
 * Key shape: normalizedTitle|YYYY-MM-DD|normalizedLocation
 */
export function buildDedupeKey(
  title: string,
  startDateIso: string,
  location: string | null
): string {
  const normTitle = normalizeText(title);
  const day = startDateIso.slice(0, 10); // YYYY-MM-DD
  const normLocation = normalizeText(location);
  return `${normTitle}|${day}|${normLocation}`;
}

/** Build "venue • city • country" location string from venue parts. */
export function buildLocationString(
  venueName: string | null | undefined,
  city: string | null | undefined,
  country: string | null | undefined
): string | null {
  const parts = [venueName, city, country].filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0
  );
  return parts.length > 0 ? parts.join(" \u2022 ") : null;
}

/**
 * Format a Date as ISO 8601 WITHOUT milliseconds.
 * Ticketmaster can 400 if you include ms in startDateTime/endDateTime params.
 */
export function formatIsoNoMs(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Promise-based sleep. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Simple timestamped logger. */
export const log = {
  info: (...args: unknown[]) =>
    console.log(`[${new Date().toISOString()}] [INFO]`, ...args),
  warn: (...args: unknown[]) =>
    console.warn(`[${new Date().toISOString()}] [WARN]`, ...args),
  error: (...args: unknown[]) =>
    console.error(`[${new Date().toISOString()}] [ERROR]`, ...args),
};
