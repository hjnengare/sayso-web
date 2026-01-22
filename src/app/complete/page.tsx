"use client";

import { useEffect, Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle } from "lucide-react";
import { ShieldCheck, Clock, Smile, BadgeDollarSign } from "lucide-react";
import { useReducedMotion } from "../utils/useReducedMotion";
import { 
  OnboardingLayout, 
  OnboardingErrorBoundary, 
  OnboardingErrorBanner,
  OnboardingActionBar 
} from "../components/Onboarding";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";
import { Loader } from "../components/Loader";
import { useCompletePage } from "../hooks/useCompletePage";

// Dealbreaker icon mapping
const DEALBREAKER_ICONS: { [key: string]: React.ComponentType<{ className?: string }> } = {
  "trustworthiness": ShieldCheck,
  "punctuality": Clock,
  "friendliness": Smile,
  "value-for-money": BadgeDollarSign,
};

// 🎨 Additional animations + highlight removal
const completeStyles = `
  .title-no-break {
    word-break: keep-all;
    overflow-wrap: normal;
    white-space: normal;
  }

  @media (max-width: 768px) {
    .title-no-break {
      word-break: keep-all;
      overflow-wrap: normal;
      white-space: nowrap;
      max-width: 100%;
    }
    
    .title-no-break h1 {
      white-space: nowrap;
      word-break: keep-all;
      overflow-wrap: normal;
    }
  }

  * {
    -webkit-tap-highlight-color: transparent;
  }

  @keyframes floatIcon {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-8px) scale(1.05); }
  }

  @keyframes floatHorizontal {
    0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
    25% { transform: translateX(5px) translateY(-6px) rotate(5deg); }
    50% { transform: translateX(-3px) translateY(-10px) rotate(-3deg); }
    75% { transform: translateX(3px) translateY(-4px) rotate(2deg); }
  }

  .dealbreakers-icons-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .floating-dealbreaker-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 1;
    opacity: 0.8;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
    animation: floatIcon 3s ease-in-out infinite;
  }

  .floating-dealbreaker-icon:nth-child(1) { animation-delay: 0s; }
  .floating-dealbreaker-icon:nth-child(2) { animation-delay: 0.3s; }
  .floating-dealbreaker-icon:nth-child(3) { animation-delay: 0.6s; }
  .floating-dealbreaker-icon:nth-child(4) { animation-delay: 0.9s; }

  @media (max-width: 768px) {
    .dealbreakers-icons-container {
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .floating-dealbreaker-icon {
      opacity: 0.7;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .floating-dealbreaker-icon {
      animation: none !important;
      opacity: 0.6 !important;
    }
  }
`;

/** ---------- Shared fonts ---------- */
const sf = {
  fontFamily:
    '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
} as const;

function CompletePageContent() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [isNavigating, setIsNavigating] = useState(false);
  const {
    isVerifying,
    handleContinue: hookHandleContinue,
    dealbreakers: selectedDealbreakers,
  } = useCompletePage();

  // Enhanced continue handler with navigation state
  const handleContinue = async () => {
    if (isNavigating) return; // Prevent double-clicks
    
    try {
      setIsNavigating(true);
      console.log('[Complete Page] Initiating navigation to home');
      // Call the hook's handler which uses router.replace
      hookHandleContinue();
      
      // Reset state after 3 seconds in case navigation fails
      setTimeout(() => {
        setIsNavigating(false);
      }, 3000);
    } catch (error) {
      console.error('[Complete] Error navigating to home:', error);
      setIsNavigating(false);
    }
  };

  // Confetti celebration (deferred until after initial render for better performance)
  useEffect(() => {
    if (isVerifying) return;
    
    // Prefetch home immediately for instant transition after completion
    if (router) {
      router.prefetch('/home');
    }
    
    // 🎉 Confetti rain effect - defer to avoid blocking initial render
    if (!reducedMotion && typeof window !== 'undefined') {
      let cancelled = false;

      // Use requestIdleCallback or setTimeout to defer non-critical animation
      const loadConfetti = () => {
        // Dynamically import canvas-confetti to avoid SSR issues and reduce initial bundle
        import('canvas-confetti').then((confetti) => {
          if (cancelled) return;
          
          const duration = 2000; // Reduced to 2 seconds for faster page load
          const end = Date.now() + duration;

          (function frame() {
            if (cancelled) return;

            // Use app color scheme: sage, coral, white, and gold
            const colors = ['#7D9B76', '#E88D67', '#FFFFFF', '#FFD700'];

            confetti.default({
              particleCount: 3, // Reduced particle count for better performance
              angle: 60,
              spread: 55,
              origin: { x: 0 },
              colors: colors,
            });
            confetti.default({
              particleCount: 3,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
              colors: colors,
            });

            if (Date.now() < end) requestAnimationFrame(frame);
          })();
        }).catch((error) => {
          console.error('Failed to load confetti:', error);
        });
      };

      // Defer confetti loading using requestIdleCallback if available, otherwise setTimeout
      if ('requestIdleCallback' in window) {
        requestIdleCallback(loadConfetti, { timeout: 1000 });
      } else {
        setTimeout(loadConfetti, 300); // Small delay to allow page to render first
      }

      return () => {
        cancelled = true;
      };
    }
  }, [reducedMotion, isVerifying, router]);

  // Show loading state while verifying
  if (isVerifying) {
    return (
      <OnboardingLayout step={4} showProgress={false}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader size="md" variant="wavy" color="sage" />
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: completeStyles }} />
      <OnboardingLayout step={4} showProgress={false}>
        <div
          className="text-center animate-fade-in-up flex-1 flex flex-col justify-center px-4 relative"
          style={
            {
              "--coral": "hsl(16, 100%, 66%)",
              "--sage": "hsl(148, 20%, 38%)",
              "--charcoal": "hsl(0, 0%, 25%)",
              "--off-white": "hsl(0, 0%, 98%)",
              ...sf,
            } as React.CSSProperties
          }
        >
          {/* Heading */}
          <div className="title-no-break mb-4">
            <WavyTypedTitle
              text="You're all set!"
              as="h1"
              className="font-urbanist text-lg md:text-4xl lg:text-5xl font-700 tracking-tight leading-snug text-charcoal"
              typingSpeedMs={40}
              startDelayMs={300}
              waveVariant="subtle"
              loopWave={false}
              triggerOnTypingComplete={true}
              enableScrollTrigger={false}
              style={{ 
                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                fontWeight: 700,
              }}
            />
          </div>

          {/* Subheading */}
          <p className="text-base md:text-lg font-normal text-charcoal/70 mb-4 leading-relaxed" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            Time to discover what&apos;s out there.
          </p>

          {/* Floating dealbreaker icons */}
          {selectedDealbreakers.length > 0 && (
            <div className="dealbreakers-icons-container">
              {selectedDealbreakers.map((dealbreakerId) => {
                const IconComponent = DEALBREAKER_ICONS[dealbreakerId];
                if (!IconComponent) return null;
                
                return (
                  <div
                    key={dealbreakerId}
                    className="floating-dealbreaker-icon"
                    aria-hidden="true"
                  >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-sage/20 to-coral/20 border-2 border-sage/30 flex items-center justify-center backdrop-blur-sm">
                      <IconComponent className="w-6 h-6 md:w-7 md:h-7 text-sage" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Continue CTA */}
          <OnboardingActionBar align="center">
            <button
              onClick={handleContinue}
              disabled={isNavigating}
              data-testid="onboarding-complete-cta"
              aria-label="Go to Home"
              className="relative block w-[200px] mx-auto rounded-full py-4 px-4 text-body font-semibold text-white text-center flex items-center justify-center bg-gradient-to-r from-coral to-coral/80 hover:from-sage hover:to-sage border border-white/30 ring-1 ring-coral/20 hover:ring-sage/20 backdrop-blur-sm transition-all duration-300 btn-target btn-press focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/30 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
            >
              {isNavigating ? 'Going to Home...' : 'Continue to Home'}
              {!isNavigating && <ArrowRight className="w-5 h-5 ml-2 inline-block" />}
            </button>
          </OnboardingActionBar>

          {/* Completion badge */}
          <div className="mt-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-sage/15 to-sage/10 border border-sage/40 ring-1 ring-sage/20 rounded-full backdrop-blur-sm">
              <CheckCircle className="w-4 h-4 text-sage" />
              <span className="text-xs font-semibold text-sage" style={sf}>
                Setup Complete
              </span>
            </div>
          </div>
        </div>
      </OnboardingLayout>
    </>
  );
}

export default function CompletePage() {
  return (
    <ProtectedRoute requiresAuth={true}>
      <OnboardingErrorBoundary>
        <Suspense fallback={
          <OnboardingLayout step={4} showProgress={false}>
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader size="md" variant="wavy" color="sage" />
            </div>
          </OnboardingLayout>
        }>
          <CompletePageContent />
        </Suspense>
      </OnboardingErrorBoundary>
    </ProtectedRoute>
  );
}