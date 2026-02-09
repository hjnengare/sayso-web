const ANON_STORAGE_KEY = "sayso_anon_id";

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function createUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return createUuid();

  const existing = window.localStorage.getItem(ANON_STORAGE_KEY);
  if (existing && isUuidLike(existing)) {
    return existing;
  }

  const newId = createUuid();
  window.localStorage.setItem(ANON_STORAGE_KEY, newId);
  return newId;
}
