"use client";

import { useEffect, useRef } from "react";
import { useIsDesktop } from "./useIsDesktop";

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

/**
 * Scroll reveal hook that animates elements when they enter the viewport.
 * On mobile (< md): no animation — [data-reveal] elements get .active immediately.
 * On desktop (md+): existing IntersectionObserver-based reveal.
 */
export function useScrollReveal(options: UseScrollRevealOptions = {}) {
  const isDesktop = useIsDesktop();
  const {
    threshold = 0.1,
    rootMargin = "0px 0px -100px 0px",
    once = true,
  } = options;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElementsRef = useRef<Set<Element>>(new Set());
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isDesktop) {
      const revealAll = () => {
        document.querySelectorAll?.("[data-reveal], [data-section]").forEach((el) => {
          el.classList.add("active");
        });
      };
      revealAll();
      const timeoutId = setTimeout(revealAll, 0);
      return () => clearTimeout(timeoutId);
    }

    // Create IntersectionObserver (desktop only)
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
            
            // If once is true, stop observing after first reveal
            if (once && observerRef.current) {
              observerRef.current.unobserve(entry.target);
              observedElementsRef.current.delete(entry.target);
            }
          } else if (!once) {
            // If not once, remove active class when element leaves viewport
            entry.target.classList.remove("active");
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    const observeElement = (element: Element) => {
      if (!observerRef.current) return;
      if (observedElementsRef.current.has(element)) return;
      observerRef.current.observe(element);
      observedElementsRef.current.add(element);
    };

    const observeFromRoot = (root: ParentNode) => {
      const sections = root.querySelectorAll?.("[data-section]") || [];
      sections.forEach((section) => observeElement(section));

      const reveals = root.querySelectorAll?.("[data-reveal]") || [];
      reveals.forEach((el) => observeElement(el));
    };

    const observeNode = (node: Node) => {
      if (!(node instanceof Element)) return;
      if (node.matches("[data-section], [data-reveal]")) {
        observeElement(node);
      }
      observeFromRoot(node);
    };

    const scheduleObserveAll = () => {
      if (rafIdRef.current != null) return;
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        observeFromRoot(document);
      });
    };

    // Initial observation - use setTimeout to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      observeFromRoot(document);
    }, 0);

    // Also observe on any dynamic content changes
    const mutationObserver = new MutationObserver((mutations) => {
      // Prefer scanning only newly-added nodes (cheap), fall back to a debounced full scan.
      let sawAddedNodes = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
          sawAddedNodes = true;
          mutation.addedNodes.forEach((n) => observeNode(n));
        }
      }
      if (!sawAddedNodes) {
        scheduleObserveAll();
      }
    });

    // Observe the document body for new sections
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      mutationObserver.disconnect();
      if (observerRef.current) {
        observedElementsRef.current.forEach((element) => {
          observerRef.current?.unobserve(element);
        });
        observerRef.current.disconnect();
        observedElementsRef.current.clear();
      }
    };
  }, [isDesktop, threshold, rootMargin, once]);

  return null;
}
