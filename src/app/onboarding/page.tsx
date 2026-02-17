"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";

/*──────────────────────────────────────────────────────────────
  Parallax-depth entrance keyframes (GPU-only: transform + opacity)

  depth-1  (foreground / CTA)  → subtle, fast
  depth-2  (midground / cards)  → moderate
  depth-3  (background / text)  → deeper travel, slower
──────────────────────────────────────────────────────────────*/
const styles = `
  @keyframes depthIn1 {
    from { opacity: 0; transform: translate3d(0, 6px, 0) scale(1); }
    to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }
  @keyframes depthIn2 {
    from { opacity: 0; transform: translate3d(0, 10px, 0) scale(0.99); }
    to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }
  @keyframes depthIn3 {
    from { opacity: 0; transform: translate3d(0, 14px, 0) scale(0.98); }
    to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }

  [data-depth] {
    opacity: 0;
    will-change: transform, opacity;
  }
  [data-depth="1"] { animation: depthIn1 200ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  [data-depth="2"] { animation: depthIn2 240ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  [data-depth="3"] { animation: depthIn3 280ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }

  /* Stagger siblings via --depth-i (set inline) */
  [data-depth] { animation-delay: calc(var(--depth-i, 0) * 50ms); }

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

  /* Reduced motion: instant render, no transforms */
  @media (prefers-reduced-motion: reduce) {
    [data-depth] {
      opacity: 1 !important;
      transform: none !important;
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
  // Clean up will-change after entrance animations complete (perf)
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      el.querySelectorAll("[data-depth]").forEach((node) => {
        (node as HTMLElement).style.willChange = "auto";
      });
    }, 600); // well after longest animation (280ms + max stagger ~250ms)
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
        className="min-h-[100svh] md:min-h-[100dvh] bg-off-white flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden safe-area-padding"
      >
        <div className="w-full mx-auto max-w-xl relative z-10 flex flex-col items-center">

          {/* LOGO — depth-3 (background layer, enters first) */}
          <div className="mb-4" data-depth="3" style={{ "--depth-i": 0 } as React.CSSProperties}>
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

            {/* Title — depth-3 */}
            <div data-depth="3" style={{ "--depth-i": 1 } as React.CSSProperties} className="title-no-break">
              <h2 className="font-urbanist text-2xl sm:text-3xl md:text-5xl font-700 leading-[1.2] tracking-tight text-charcoal no-hyphens">
                <div className="block whitespace-nowrap">
                  <WavyTypedTitle
                    text="Discover gems near you!"
                    as="span"
                    className="inline-block"
                    typingSpeedMs={40}
                    startDelayMs={300}
                    waveVariant="subtle"
                    loopWave={false}
                    triggerOnTypingComplete={true}
                    enableScrollTrigger={false}
                  />
                </div>
              </h2>
            </div>

            {/* Subtitle — depth-3 */}
            <p
              data-depth="3"
              style={{ "--depth-i": 2 } as React.CSSProperties}
              className="text-body font-normal text-charcoal/70 leading-[1.55] max-w-[50ch] no-hyphens"
            >
              Explore trusted businesses, leave reviews and see what&apos;s trending around you
            </p>

            {/* CTA + auth links */}
            <div className="flex flex-col items-center gap-4 mt-4">
              {/* Get Started — depth-1 (foreground, crispest) */}
              <div data-depth="1" style={{ "--depth-i": 3 } as React.CSSProperties}>
                <Link
                  href="/home?guest=true"
                  className="group relative block w-[200px] rounded-full py-4 px-6 text-body font-semibold text-white text-center bg-gradient-to-r from-coral to-coral/80 hover:from-sage hover:to-sage transition-all duration-300 btn-press shadow-md focus-visible:ring-4 focus-visible:ring-sage/30 focus-visible:ring-offset-2"
                >
                  <span className="relative z-10">Get Started</span>
                </Link>
              </div>

              {/* Sign Up / Log In — depth-2 (midground) */}
              <div
                data-depth="2"
                style={{ "--depth-i": 4 } as React.CSSProperties}
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

            {/* Tagline — depth-2 */}
            <p
              data-depth="2"
              style={{ "--depth-i": 5 } as React.CSSProperties}
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
