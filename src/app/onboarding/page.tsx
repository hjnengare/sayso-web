"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useMounted } from "../hooks/useMounted";
import { useScrollReveal } from "../hooks/useScrollReveal";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";

const styles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { transform: scale(0); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
  .animate-scale-in { animation: scaleIn 0.6s ease-out forwards; }

  .delay-400 { animation-delay: .4s }
  .delay-600 { animation-delay: .6s }
  .delay-800 { animation-delay: .8s }
  .delay-1000 { animation-delay: 1s }

  @keyframes shimmerSweep {
    0% { background-position: -150% 0; opacity: .2; }
    50% { opacity: .6; }
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

  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
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
  const mounted = useMounted();

  useScrollReveal({ threshold: 0.1, rootMargin: "0px 0px -50px 0px", once: true });

  useEffect(() => {
    document.title = "Onboarding - sayso";
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="min-h-[100svh] md:min-h-[100dvh] bg-off-white flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden safe-area-padding">

        <div className="w-full mx-auto max-w-xl relative z-10 flex flex-col items-center">
          
          {/* LOGO */}
          <div className="mb-4" data-reveal>
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
            
            <div data-reveal className="title-no-break">
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

            <p
              data-reveal
              className="text-body font-normal text-charcoal/70 leading-[1.55] max-w-[50ch] no-hyphens"
            >
              Explore trusted businesses, leave reviews and see what&apos;s trending around you
            </p>

            <div className="flex flex-col items-center gap-4 mt-4">
              <div data-reveal>
                <Link
                  href="/home?guest=true"
                  className="group relative block w-[200px] rounded-full py-4 px-6 text-body font-semibold text-white text-center bg-gradient-to-r from-coral to-coral/80 hover:from-sage hover:to-sage transition-all duration-300 btn-press shadow-md focus-visible:ring-4 focus-visible:ring-sage/30 focus-visible:ring-offset-2"
                >
                  <span className="relative z-10">Get Started</span>
                </Link>
              </div>

              <div data-reveal className="text-center text-charcoal/70 hover:text-charcoal transition-colors duration-300 text-sm font-medium">
                <Link href="/register" className="font-semibold text-charcoal hover:underline">
                  Sign Up
                </Link>
                <span className="text-charcoal/90" aria-hidden="true"> or </span>
                <Link href="/login" className="font-semibold text-coral hover:underline">
                  Log In
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
