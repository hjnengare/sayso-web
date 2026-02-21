"use client";
import { useEffect, useState } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    setReduced(mq.matches);

    if (mq.addEventListener) {
      mq.addEventListener("change", onChange);
    } else if (mq.addListener) {
      mq.addListener(onChange);
    }

    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener("change", onChange);
      } else if (mq.removeListener) {
        mq.removeListener(onChange);
      }
    };
  }, []);

  return reduced;
}
