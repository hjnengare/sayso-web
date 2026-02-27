import { useMemo, useRef } from "react";

interface UseRefreshDiffParams<T> {
  /** Current item list */
  items: T[];
  /** Stable unique key for each item */
  keyOf: (item: T) => string;
  /**
   * Optional signature for change detection.
   * If omitted, key presence/absence is used (new items only).
   */
  signatureOf?: (item: T) => string;
  /**
   * Opaque token that changes when a refresh occurs.
   * Typically an SWR `isValidating` counter or a timestamp string.
   */
  refreshToken: string;
  /** Maximum number of items to animate per refresh batch (default: 10). */
  maxAnimated?: number;
  /** Whether all items should animate on first mount (default: true). */
  animateAllOnFirstMount?: boolean;
}

interface UseRefreshDiffResult {
  /** Returns true when the item with the given key should animate. */
  shouldAnimateKey: (key: string) => boolean;
  /** Returns the stagger order for the item with the given key. */
  orderForKey: (key: string) => number;
}

/**
 * Tracks which items are new or changed across SWR refreshes so only
 * those elements receive entry choreography. Stable items remain static.
 *
 * @example
 * const { shouldAnimateKey, orderForKey } = useRefreshDiff({
 *   items: businesses,
 *   keyOf: (b) => b.id,
 *   refreshToken: String(isValidating),
 *   maxAnimated: 10,
 * });
 */
export function useRefreshDiff<T>({
  items,
  keyOf,
  signatureOf,
  refreshToken,
  maxAnimated = 10,
  animateAllOnFirstMount = true,
}: UseRefreshDiffParams<T>): UseRefreshDiffResult {
  const prevKeysRef = useRef<Map<string, string>>(new Map());
  const prevTokenRef = useRef<string | null>(null);
  const isFirstMount = useRef(true);

  const result = useMemo(() => {
    const prevKeys = prevKeysRef.current;
    const currentKeys = new Map<string, string>();

    for (const item of items) {
      const key = keyOf(item);
      const sig = signatureOf ? signatureOf(item) : key;
      currentKeys.set(key, sig);
    }

    let keysToAnimate: string[];

    if (isFirstMount.current) {
      isFirstMount.current = false;
      keysToAnimate = animateAllOnFirstMount ? [...currentKeys.keys()] : [];
    } else if (prevTokenRef.current !== refreshToken) {
      // Refresh occurred — find new or changed items
      keysToAnimate = [];
      for (const [key, sig] of currentKeys) {
        const prevSig = prevKeys.get(key);
        if (prevSig === undefined || prevSig !== sig) {
          keysToAnimate.push(key);
        }
      }
    } else {
      keysToAnimate = [];
    }

    // Update refs
    prevKeysRef.current = currentKeys;
    prevTokenRef.current = refreshToken;

    // Cap and build order map
    const capped = keysToAnimate.slice(0, maxAnimated);
    const cappedSet = new Set(capped);
    const orderMap = new Map<string, number>();
    capped.forEach((key, i) => orderMap.set(key, i));

    return { cappedSet, orderMap };
  }, [items, keyOf, signatureOf, refreshToken, maxAnimated, animateAllOnFirstMount]);

  return {
    shouldAnimateKey: (key: string) => result.cappedSet.has(key),
    orderForKey: (key: string) => result.orderMap.get(key) ?? 0,
  };
}
