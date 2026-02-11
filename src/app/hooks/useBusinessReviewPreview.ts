"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeReviewPreviewText } from "../lib/utils/reviewPreview";

export interface BusinessReviewPreview {
  businessId: string;
  content: string;
  rating: number | null;
  createdAt: string | null;
}

type CachedPreview = BusinessReviewPreview | null;

const previewCache = new Map<string, CachedPreview>();
const subscribers = new Map<string, Set<(value: CachedPreview) => void>>();
const queuedBusinessIds = new Set<string>();

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;

function notifySubscribers(businessId: string) {
  const listeners = subscribers.get(businessId);
  if (!listeners || listeners.size === 0) return;
  const value = previewCache.get(businessId) ?? null;
  listeners.forEach((listener) => listener(value));
}

function subscribeToBusinessPreview(
  businessId: string,
  listener: (value: CachedPreview) => void
) {
  if (!subscribers.has(businessId)) {
    subscribers.set(businessId, new Set());
  }
  const listeners = subscribers.get(businessId)!;
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      subscribers.delete(businessId);
    }
  };
}

function enqueuePreviewFetch(businessId: string) {
  if (!businessId || previewCache.has(businessId)) return;
  queuedBusinessIds.add(businessId);
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer || isFlushing) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, 50);
}

async function flushQueue() {
  if (isFlushing || queuedBusinessIds.size === 0) return;

  isFlushing = true;
  const batch = Array.from(queuedBusinessIds).slice(0, 80);
  batch.forEach((businessId) => queuedBusinessIds.delete(businessId));

  try {
    const response = await fetch("/api/reviews/previews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ businessIds: batch }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const previews = payload?.previews as Record<string, any> | undefined;

    for (const businessId of batch) {
      const rawPreview = previews?.[businessId];
      const content = normalizeReviewPreviewText(rawPreview?.content);

      if (!content) {
        previewCache.set(businessId, null);
      } else {
        previewCache.set(businessId, {
          businessId,
          content,
          rating: typeof rawPreview?.rating === "number" ? rawPreview.rating : null,
          createdAt: typeof rawPreview?.createdAt === "string" ? rawPreview.createdAt : null,
        });
      }
      notifySubscribers(businessId);
    }
  } catch (error) {
    console.error("[REVIEW PREVIEW] Batch fetch failed:", error);
    for (const businessId of batch) {
      previewCache.set(businessId, null);
      notifySubscribers(businessId);
    }
  } finally {
    isFlushing = false;
    if (queuedBusinessIds.size > 0) {
      scheduleFlush();
    }
  }
}

export function useBusinessReviewPreview(businessId?: string | null) {
  const normalizedBusinessId = useMemo(
    () => (typeof businessId === "string" ? businessId.trim() : ""),
    [businessId]
  );

  const [preview, setPreview] = useState<CachedPreview | undefined>(() => {
    if (!normalizedBusinessId) return null;
    return previewCache.get(normalizedBusinessId);
  });

  useEffect(() => {
    if (!normalizedBusinessId) {
      setPreview(null);
      return;
    }

    setPreview(previewCache.get(normalizedBusinessId));

    const unsubscribe = subscribeToBusinessPreview(normalizedBusinessId, setPreview);
    if (!previewCache.has(normalizedBusinessId)) {
      enqueuePreviewFetch(normalizedBusinessId);
    }

    return unsubscribe;
  }, [normalizedBusinessId]);

  const loading = normalizedBusinessId.length > 0 && !previewCache.has(normalizedBusinessId);

  return {
    preview: preview ?? null,
    loading,
  };
}
