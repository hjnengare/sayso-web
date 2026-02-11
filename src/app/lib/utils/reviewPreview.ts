/**
 * Normalize review text for compact card previews.
 * Collapses whitespace/newlines to keep snippets stable across cards.
 */
export function normalizeReviewPreviewText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}
