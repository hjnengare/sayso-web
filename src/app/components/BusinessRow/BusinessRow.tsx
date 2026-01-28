// src/components/BusinessRow/BusinessRow.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import BusinessCard, { Business } from "../BusinessCard/BusinessCard";
import ScrollableSection from "../ScrollableSection/ScrollableSection";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";

export default function BusinessRow({
  title,
  businesses,
  cta = "View All",
  href = "/home",
}: {
  title: string;
  businesses: Business[];
  cta?: string;
  href?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!href || !href.startsWith("/")) return;
    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const prefetch = () => {
      if (typeof router.prefetch !== "function") return;
      try {
        const maybePromise = router.prefetch(href);
        if (typeof (maybePromise as unknown as Promise<unknown>)?.catch === "function") {
          (maybePromise as unknown as Promise<unknown>).catch(() => {
            // ignore failures (e.g., dynamic routes without params yet)
          });
        }
      } catch {
        // ignore synchronous failures
      }
    };

    const schedulePrefetch = () => {
      if (typeof window === "undefined") return;
      const idleCallback = (window as any).requestIdleCallback;
      if (typeof idleCallback === "function") {
        idleId = idleCallback(prefetch, { timeout: 1200 });
      } else {
        timeoutId = window.setTimeout(prefetch, 120);
      }
    };

    schedulePrefetch();

    return () => {
      if (typeof window === "undefined") return;
      if (idleId !== null && typeof (window as any).cancelIdleCallback === "function") {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [href, router]);

  if (!businesses || businesses.length === 0) return null;

  return (
    <section
      className="relative m-0 p-0 w-full"
      aria-label={title}
      style={{
        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      <div className="mx-auto w-full relative z-10 px-2">
        <div className="pb-4 sm:pb-8 md:pb-10 flex flex-wrap items-center justify-between gap-2">
          <WavyTypedTitle
            text={title}
            as="h2"
            className="font-urbanist text-h2 sm:text-h1 font-700 text-charcoal hover:text-sage transition-all duration-300 px-3 sm:px-4 py-1 hover:bg-sage/5 rounded-lg cursor-default"
            typingSpeedMs={40}
            startDelayMs={300}
            waveVariant="subtle"
            loopWave={false}
            enableScrollTrigger={true}
            disableWave={true}
            style={{ 
              fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              fontWeight: 700,
            }}
          />

          <button
            onClick={() => router.push(href)}
            className="group inline-flex items-center gap-1 text-body-sm sm:text-caption font-normal text-charcoal transition-all duration-300 hover:text-sage focus:outline-none px-4 py-2 -mx-2 relative"
            aria-label={`${cta}: ${title}`}
          >
            <span
              className="relative z-10 transition-transform duration-300 group-hover:-translate-x-0.5 text-charcoal group-hover:text-sage"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
            >
              {cta.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
            </span>
            <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 text-charcoal group-hover:text-sage" />
          </button>
        </div>

        <ScrollableSection className="-mx-2 px-2">
          {/* Gap harmonizes with card radius/shadows; list semantics preserved via <li> inside cards */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media (max-width: 639px) {
              .business-card-full-width > li {
                width: 100% !important;
                max-width: 100% !important;
              }
            }
          `}} />
          <div className="flex gap-2 sm:gap-2 md:gap-2 lg:gap-1.5 xl:gap-1.5 2xl:gap-1 items-stretch pt-2">
            {businesses.map((business, index) => (
              <div
                key={business.id}
                className="snap-start snap-always flex-shrink-0 w-[100vw] sm:w-auto min-w-[clamp(200px,16vw,300px)] list-none flex justify-center business-card-full-width"
              >
                <BusinessCard business={business} index={index} />
              </div>
            ))}
          </div>
        </ScrollableSection>
      </div>
    </section>
  );
}
