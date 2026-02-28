"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";

/*──────────────────────────────────────────────────────────────
  Per-element entrance animations — each has its own character:

  logo     → scale-up zoom  (scale 0.82 → 1)
  heading  → slide-up + subtle scale
  subtitle → clean slide-up fade
  cta      → spring overshoot pop
  auth     → horizontal slide-in from left
  tagline  → blur dissolve fade
──────────────────────────────────────────────────────────────*/
const styles = `
  @keyframes animLogo {
    from { opacity: 0; transform: scale(0.82) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes animHeading {
    from { opacity: 0; transform: translateY(26px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes animSubtitle {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes animCta {
    0%   { opacity: 0; transform: translateY(14px) scale(0.92); }
    65%  { opacity: 1; transform: translateY(-4px) scale(1.03); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes animAuth {
    from { opacity: 0; transform: translateX(-14px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes animTagline {
    from { opacity: 0; filter: blur(5px); transform: translateY(8px); }
    to   { opacity: 1; filter: blur(0px); transform: translateY(0); }
  }

  [data-anim] { opacity: 0; will-change: transform, opacity; }

  [data-anim="logo"]     { animation: animLogo     360ms cubic-bezier(0.22, 1, 0.36, 1)    0ms  forwards; }
  [data-anim="heading"]  { animation: animHeading  440ms cubic-bezier(0.16, 1, 0.3, 1)    80ms  forwards; }
  [data-anim="subtitle"] { animation: animSubtitle 380ms cubic-bezier(0.22, 1, 0.36, 1)  190ms  forwards; }
  [data-anim="cta"]      { animation: animCta      500ms cubic-bezier(0.34, 1.56, 0.64, 1) 300ms forwards; }
  [data-anim="auth"]     { animation: animAuth     320ms cubic-bezier(0.22, 1, 0.36, 1)  390ms  forwards; }
  [data-anim="tagline"]  { animation: animTagline  420ms ease-in-out                      480ms  forwards; }

  /* Shimmer on title */
  @keyframes shimmerSweep {
    0%   { background-position: -150% 0; opacity: .2; }
    50%  { opacity: .6; }
    100% { background-position: 150% 0; opacity: .2; }
  }
  .shimmer-overlay {
    position: relative;
    color: #222222;
    display: inline-block;
  }
  .shimmer-overlay::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      120deg,
      transparent 0%,
      rgba(255,255,255,0.35) 45%,
      rgba(180,180,180,0.25) 50%,
      transparent 55%
    );
    background-size: 200% 100%;
    animation: shimmerSweep 4s ease-in-out infinite;
    mix-blend-mode: lighten;
    pointer-events: none;
    border-radius: 0.25rem;
  }

  /* Reduced motion: instant render, no transforms, no blur */
  @media (prefers-reduced-motion: reduce) {
    [data-anim] {
      opacity: 1 !important;
      transform: none !important;
      filter: none !important;
      animation: none !important;
      will-change: auto !important;
    }
    .shimmer-overlay::after { animation: none !important; }
  }

  .safe-area-padding {
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }

  .btn-press:active { transform: scale(0.98); transition: transform 0.1s ease; }

  .no-hyphens {
    hyphens: none;
    word-break: normal;
    overflow-wrap: break-word;
  }

  .title-no-break {
    word-break: keep-all;
    overflow-wrap: break-word;
    white-space: normal;
    hyphens: none;
  }
`;

export default function OnboardingPage() {
  // Clean up will-change after all animations complete
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      el.querySelectorAll("[data-anim]").forEach((node) => {
        (node as HTMLElement).style.willChange = "auto";
      });
    }, 1000); // after tagline (480ms delay + 420ms duration)
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.title = "Onboarding - sayso";
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div
        ref={rootRef}
        className="min-h-[100svh] md:  bg-off-white flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden safe-area-padding"
      >
        <div className="w-full mx-auto max-w-xl relative z-10 flex flex-col items-center">

          {/* LOGO — zoom scale-up */}
          <div className="mb-4" data-anim="logo">
            <div className="flex items-center justify-center">
              <Image
                src="/logos/logo.png"
                alt="Sayso logo"
                width={100}
                height={60}
                className="object-contain w-auto h-[96px] sm:h-[108px] md:h-[120px]"
              />
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="text-center flex flex-col items-center gap-6">

            {/* Title — slide-up + scale */}
            <div data-anim="heading" className="title-no-break">
              <h2 className="font-urbanist text-2xl sm:text-3xl md:text-5xl font-700 leading-[1.2] tracking-tight text-charcoal no-hyphens">
                <div className="block whitespace-nowrap">
                  <span className="inline-block">Discover gems near you!</span>
                </div>
              </h2>
            </div>

            {/* Subtitle — clean slide-up */}
            <p
              data-anim="subtitle"
              className="text-body font-normal text-charcoal/70 leading-[1.55] max-w-[50ch] no-hyphens"
            >
              Explore trusted businesses, leave reviews and see what&apos;s trending around you
            </p>

            {/* CTA + auth links */}
            <div className="flex flex-col items-center gap-4 mt-4">
              {/* Get Started — spring overshoot */}
              <div data-anim="cta">
                <Link
                  href="/home?guest=true"
                  className="group relative block w-[200px] rounded-full py-4 px-6 text-body font-semibold text-white text-center bg-gradient-to-r from-coral to-coral/80 hover:from-sage hover:to-sage transition-all duration-300 btn-press shadow-md focus-visible:ring-4 focus-visible:ring-sage/30 focus-visible:ring-offset-2"
                >
                  <span className="relative z-10">Get Started</span>
                </Link>
              </div>

              {/* Sign Up / Log In — horizontal slide from left */}
              <div
                data-anim="auth"
                className="text-center text-charcoal/70 hover:text-charcoal transition-colors duration-300 text-sm font-medium"
              >
                <Link href="/register" className="font-semibold text-charcoal hover:underline">
                  Sign Up
                </Link>
                <span className="text-charcoal/90" aria-hidden="true"> or </span>
                <Link href="/login" className="font-semibold text-coral hover:underline">
                  Log In
                </Link>
              </div>
            </div>

            {/* Tagline — blur dissolve fade */}
            <p
              data-anim="tagline"
              className="font-urbanist text-sm text-charcoal/80 font-medium italic no-hyphens"
            >
              Less guessing, more confessing
            </p>

          </div>
        </div>
      </div>
    </>
  );
}
