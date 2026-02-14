"use client";

import { useState, useEffect } from "react";

const MEDIA_QUERY = "(min-width: 768px)";

/**
 * Returns true when viewport is md and up (768px+), false below.
 * Uses matchMedia and listens for changes (e.g. resize, orientation).
 * Use to disable scroll-reveal / content-reveal animations on mobile.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(MEDIA_QUERY);

    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isDesktop;
}
