"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useMounted } from "../hooks/useMounted";
import { useScrollReveal } from "../hooks/useScrollReveal";
import Logo from "../components/Logo/Logo";
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
  .ios-inertia { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .hide-scrollbar::-webkit-scrollbar { display: none; }

  .btn-press:active { transform: scale(0.98); transition: transform 0.1s ease; }

  .btn-premium {
    position: relative;
    background: linear-gradient(135deg, #7D9B76 0%, #6B8A64 100%);
    border: 1px solid rgba(255,255,255,0.3);
    ring: 1px solid rgba(125,155,118,0.2);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
  }
  .btn-premium:hover {
    transform: translateY(-2px);
    border-color: rgba(255,255,255,0.4);
    ring-color: rgba(125,155,118,0.3);
  }
  .btn-premium:active { transform: translateY(0); }

  :focus-visible {
    outline: none;
    ring: 2px solid rgba(104,163,130,0.40);
    ring-offset: 2px;
    ring-offset-color: #ffffff;
  }

  .no-hyphens {
    hyphens: none;
    -webkit-hyphens: none;
    -moz-hyphens: none;
    -ms-hyphens: none;
    word-break: normal;
    overflow-wrap: break-word;
  }

  /* Prevent word breaking in title on mobile */
  .title-no-break {
    word-break: keep-all;
    overflow-wrap: break-word;
    white-space: normal;
    hyphens: none;
  }

  @media (max-width: 768px) {
    .title-no-break {
      word-break: keep-all;
      overflow-wrap: break-word;
      white-space: normal;
      max-width: 100%;
    }
    
    /* Prevent breaking within words - allow wrapping at word boundaries */
    .title-no-break h2 {
      white-space: normal;
      word-break: keep-all;
      overflow-wrap: break-word;
      hyphens: none;
    }
  }

`;

export default function OnboardingPage() {
  const mounted = useMounted();

  // Initialize scroll reveal (runs once per page load)
  useScrollReveal({ threshold: 0.1, rootMargin: "0px 0px -50px 0px", once: true });

  useEffect(() => {
    document.title = "Onboarding - sayso";
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="min-h-[100svh] md:min-h-[100dvh] bg-off-white flex flex-col items-center justify-center px-4 py-4 md:py-8 relative overflow-hidden safe-area-padding no-overflow">

        {/* Content */}
        <div className="w-full mx-auto max-w-[2000px] px-4 sm:px-6 lg:px-8 2xl:px-16 relative z-10 flex flex-col h-full py-4 sm:py-6">
          {/* Logo */}
          <div className="text-center mb-8 md:mb-6 flex-shrink-0 flex justify-center">
            <div data-reveal>
              <Logo variant="onboarding" />
            </div>
          </div>

          {/* Main content */}
          <div className="text-center flex-1 flex flex-col justify-center min-h-0 py-4 space-y-6 md:space-y-8">
            <div data-reveal className="title-no-break w-full block overflow-hidden">
              <h2 className="font-urbanist text-2xl sm:text-3xl md:text-5xl font-700 mb-5 md:mb-6 leading-[1.2] tracking-tight px-6 sm:px-4 md:px-2 text-charcoal no-hyphens block w-full" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 700 }}>
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
                    style={{ 
                      fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      fontWeight: 700,
                      wordBreak: 'keep-all',
                      overflowWrap: 'normal',
                      whiteSpace: 'nowrap',
                      hyphens: 'none',
                      WebkitHyphens: 'none',
                      msHyphens: 'none',
                    }}
                  />
                </div>
              </h2>
            </div>

            <p
              data-reveal
              className="text-body font-normal text-charcoal/70 leading-[1.55] max-w-[70ch] mx-auto px-4 no-hyphens"
              style={{
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 400,
              }}
            >
              Explore trusted businesses, leave reviews and see what&apos;s trending around you
            </p>

            <div className="space-y-3 md:space-y-4 max-w-xs md:max-w-md mx-auto pt-2 md:pt-4">
              <div data-reveal>
                <Link
                  href="/register"
                  className="group relative block w-[200px] mx-auto rounded-full py-4 px-4 text-body font-semibold text-white text-center flex items-center justify-center bg-gradient-to-r from-coral to-coral/80 hover:from-sage hover:to-sage transition-all duration-300 btn-target btn-press shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/30 focus-visible:ring-offset-2"
                  style={{
                    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                    fontWeight: 600,
                  }}
                >
                  <span className="relative z-10">Get Started</span>
                </Link>
              </div>

              <div data-reveal className=" text-center text-charcoal/70 hover:text-charcoal transition-colors duration-300 text-sm font-medium"
                  style={{
                    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                    fontWeight: 500,
                  }}>
             <span > Already have an account? </span>
                <Link
                  href="/login"
                  
                >
                  Log in
                </Link>
              </div>

              
            </div>
          </div>

         
        </div>
      </div>
    </>
  );
}

