"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Fontdiner_Swanky } from "next/font/google";
import { Smile, Star, Check, ArrowRight, CheckCircle } from "react-feather";
import { useAuth } from "../contexts/AuthContext";
import { useReducedMotion } from "../utils/useReducedMotion";
import OnboardingLayout from "../components/Onboarding/OnboardingLayout";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";
import WavyTypedTitle from "../../components/Animations/WavyTypedTitle";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// 🎨 Additional animations + highlight removal
const completeStyles = `
  @keyframes float {
    0% { transform: translateY(0) scale(.95); opacity: 0; }
    10% { opacity: 1; }
    50% { transform: translateY(-40%) scale(1); }
    90% { opacity: 1; }
    100% { transform: translateY(-90%) scale(.95); opacity: 0; }
  }

  .float-anim { animation: float 4s ease-in-out infinite; }
  .float-anim.delay-400 { animation-delay: .4s; }
  .float-anim.delay-800 { animation-delay: .8s; }

  /* Prevent word breaking in titles on mobile */
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

  @media (prefers-reduced-motion: reduce) {
    .float-anim { animation: none !important; }
  }

  /* 🔒 Remove browser tap highlight overlay */
  * {
    -webkit-tap-highlight-color: transparent;
  }
`;

/** ---------- Shared fonts ---------- */
const sf = {
  fontFamily:
    '"SF Pro New", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
} as const;

function CompletePageContent() {
  const { updateUser, user, refreshUser } = useAuth();
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const hasRedirectedRef = useRef(false);
  const hasMarkedCompleteRef = useRef(false);

  // Trust middleware for routing - no defensive checks needed
  // Middleware is the single source of truth for onboarding access

  // Mark onboarding as complete when this page shows (server-side check)
  // CRITICAL: This is the SINGLE AUTHORITATIVE PLACE that marks onboarding as complete
  useEffect(() => {
    if (!user || hasMarkedCompleteRef.current) return;

    const markComplete = async () => {
      try {
        // Check if already complete to avoid unnecessary API call
        if (user.profile?.onboarding_complete === true && user.profile?.onboarding_step === 'complete') {
          console.log('[Complete Page] Onboarding already marked complete');
          hasMarkedCompleteRef.current = true;
          return;
        }

        console.log('[Complete Page] Marking onboarding as complete...');
        
        // CRITICAL: Use server action to mark completion
        // This ensures completion is marked atomically and verified
        const response = await fetch('/api/user/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step: 'complete',
            markComplete: true
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Complete Page] Failed to mark onboarding as complete:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });
          throw new Error(`Failed to mark onboarding as complete: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('[Complete Page] API response:', result);

        // Refresh user data to get updated profile
        await refreshUser();
        hasMarkedCompleteRef.current = true;
        console.log('[Complete Page] Onboarding marked as complete successfully');
      } catch (error) {
        console.error('[Complete Page] Error marking onboarding as complete:', error);
        // Don't set cookie on error - let middleware handle redirect
        // This ensures we don't bypass the completion check
      }
    };

    markComplete();
  }, [user, refreshUser]);

  // Set a cookie to indicate user has visited the complete page
  // This cookie is required by middleware before allowing access to /home
  useEffect(() => {
    // Set cookie immediately when page loads - indicates user has seen the celebration page
    // Cookie expires in 1 day
    document.cookie = `onboarding_complete_visited=true; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
  }, []); // Set once on mount

  // Removed auto-redirect - user must click "Continue to Home" button
  // This gives users time to see the completion screen and celebrate

  // Handle manual redirect when button is clicked
  const handleContinueClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      
      // Ensure cookie is set before navigation (in case useEffect hasn't run yet)
      // This cookie is required by middleware to allow access to /home
      document.cookie = `onboarding_complete_visited=true; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
      
      // Navigate to home page
      router.replace('/home');
    }
  };

  useEffect(() => {
    // 🎉 Confetti rain effect
    if (!reducedMotion && typeof window !== 'undefined') {
      let cancelled = false;

      // Dynamically import canvas-confetti to avoid SSR issues
      import('canvas-confetti').then((confetti) => {
        if (cancelled) return;
        
        console.log('🎉 Starting confetti celebration!');
        
        const duration = 3000; // 3 seconds
        const end = Date.now() + duration;

        (function frame() {
          if (cancelled) return;

          // Use app color scheme: sage, coral, white, and gold
          const colors = ['#7D9B76', '#E88D67', '#FFFFFF', '#FFD700'];

          confetti.default({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors,
          });
          confetti.default({
            particleCount: 5,
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

      return () => {
        cancelled = true;
      };
    }
  }, [reducedMotion]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: completeStyles }} />
      <OnboardingLayout
        step={4}
        showProgress={false}
      >
        <div
          className="text-center animate-fade-in-up flex-1 flex flex-col justify-center px-4"
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
          <div className="title-no-break">
            <WavyTypedTitle
              text="You're all set!"
              as="h1"
              className={`${swanky.className} text-lg md:text-4xl lg:text-5xl font-700 mb-4 tracking-tight leading-snug text-charcoal`}
              typingSpeedMs={40}
              startDelayMs={300}
              waveVariant="subtle"
              loopWave={false}
              triggerOnTypingComplete={true}
              enableScrollTrigger={false}
              style={{ 
                fontFamily: swanky.style.fontFamily,
              }}
            />
          </div>
          <p className="text-base md:text-lg font-normal text-charcoal/70 mb-4 leading-relaxed" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            Time to discover what&apos;s out there.
          </p>

          {/* Floating graphics (non-interactive now) */}
          <div className="relative mx-auto mb-4 h-28 w-full max-w-[420px]" aria-hidden="true">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute bottom-0 left-[15%] w-14 h-14 rounded-full bg-gradient-to-br from-off-white/95 to-off-white/90 border-2 border-coral/60 ring-1 ring-coral/20 backdrop-blur-xl flex items-center justify-center float-anim pointer-events-none select-none">
                <Smile className="w-5 h-5 text-charcoal" aria-hidden="true" />
              </div>
              <div className="absolute bottom-0 left-[45%] w-14 h-14 rounded-full bg-gradient-to-br from-off-white/95 to-off-white/90 border-2 border-sage/60 ring-1 ring-sage/20 backdrop-blur-xl flex items-center justify-center float-anim delay-400 pointer-events-none select-none">
                <Star className="w-5 h-5 text-charcoal" aria-hidden="true" />
              </div>
              <div className="absolute bottom-0 left-[75%] w-14 h-14 rounded-full bg-gradient-to-br from-off-white/95 to-off-white/90 border-2 border-coral/60 ring-1 ring-coral/20 backdrop-blur-xl flex items-center justify-center float-anim delay-800 pointer-events-none select-none">
                <Check className="w-5 h-5 text-charcoal" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Continue CTA */}
          <div>
            <button
              onClick={handleContinueClick}
              data-testid="onboarding-complete-cta"
              aria-label="Go to Home"
              className="group inline-flex items-center justify-center w-full sm:w-auto text-white text-sm font-semibold py-4 px-8 rounded-full transition-all duration-300"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
            >
              <span
                className="
                  group relative block w-[200px] mx-auto rounded-full py-4 px-4 text-body font-semibold text-white text-center flex items-center justify-center bg-gradient-to-r from-coral to-coral/80 hover:from-sage hover:to-sage border border-white/30 ring-1 ring-coral/20 hover:ring-sage/20 backdrop-blur-sm transition-all duration-300 btn-target btn-press focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/30 focus-visible:ring-offset-2
                "
              >
                Continue to Home
                <ArrowRight className="w-5 h-5 ml-2 inline-block" />
              </span>
            </button>
          </div>

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
      <CompletePageContent />
    </ProtectedRoute>
  );
}