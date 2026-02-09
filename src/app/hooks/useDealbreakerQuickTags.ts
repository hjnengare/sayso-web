"use client";

import { useEffect, useState } from "react";

const FALLBACK_QUICK_TAGS = ["Trustworthy", "On Time", "Friendly", "Good Value"];

interface DealBreakerApiItem {
  id: string;
  label: string;
}

interface DealBreakersApiResponse {
  dealBreakers?: DealBreakerApiItem[];
}

export function useDealbreakerQuickTags(): string[] {
  const [tags, setTags] = useState<string[]>(FALLBACK_QUICK_TAGS);

  useEffect(() => {
    let active = true;

    const fetchDealbreakers = async () => {
      try {
        const response = await fetch("/api/deal-breakers", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as DealBreakersApiResponse;
        const labels = (payload.dealBreakers || [])
          .map((item) => (item?.label || "").trim())
          .filter(Boolean);

        if (!active) return;
        if (labels.length > 0) {
          setTags(Array.from(new Set(labels)));
        }
      } catch {
        // Keep fallback quick tags when request fails.
      }
    };

    fetchDealbreakers();

    return () => {
      active = false;
    };
  }, []);

  return tags;
}

