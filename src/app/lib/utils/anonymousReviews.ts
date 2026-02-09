import { createHash, randomUUID } from "crypto";

const ANON_COOKIE_NAME = "sayso_anon_id";
const ONE_HOUR_MS = 60 * 60 * 1000;

type HeaderReader = {
  headers: {
    get(name: string): string | null;
  };
};

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    const [k, ...rest] = part.split("=");
    if (k === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export function resolveAnonymousId(req: HeaderReader): { anonymousId: string; setCookie: boolean } {
  const headerAnonId = req.headers.get("x-anonymous-id")?.trim();
  const cookieAnonId = parseCookie(req.headers.get("cookie"), ANON_COOKIE_NAME)?.trim();
  const anonymousId = headerAnonId || cookieAnonId || randomUUID();
  const setCookie = !cookieAnonId;
  return { anonymousId, setCookie };
}

export function applyAnonymousCookie(response: Response, anonymousId: string) {
  const securePart = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookieValue = `${ANON_COOKIE_NAME}=${encodeURIComponent(anonymousId)}; Path=/; Max-Age=31536000; SameSite=Lax${securePart}`;
  response.headers.append("Set-Cookie", cookieValue);
}

export function getClientIp(req: HeaderReader): string | null {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || null;
}

export function getUserAgentHash(req: HeaderReader): string | null {
  const ua = req.headers.get("user-agent")?.trim();
  if (!ua) return null;
  return createHash("sha256").update(ua).digest("hex").slice(0, 32);
}

export function getRateLimitWindowStart(): string {
  return new Date(Date.now() - ONE_HOUR_MS).toISOString();
}

export function detectSpamSignals(input: string): string[] {
  const signals: string[] = [];
  const normalized = input.trim().toLowerCase();

  if (normalized.length < 10) {
    signals.push("too_short");
  }

  const urlMatches = normalized.match(/https?:\/\/|www\./g);
  if (urlMatches && urlMatches.length > 0) {
    signals.push("contains_link");
  }

  if (/([a-z0-9])\1{7,}/i.test(normalized)) {
    signals.push("excessive_repetition");
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length >= 4) {
    const uniqueWords = new Set(words);
    const uniquenessRatio = uniqueWords.size / words.length;
    if (uniquenessRatio < 0.35) {
      signals.push("low_word_uniqueness");
    }
  }

  return signals;
}
