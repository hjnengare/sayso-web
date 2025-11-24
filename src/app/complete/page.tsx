"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Smile, Star, Check, ArrowRight, CheckCircle } from "react-feather";
import { useAuth } from "../contexts/AuthContext";
import { useReducedMotion } from "../utils/useReducedMotion";
import OnboardingLayout from "../components/Onboarding/OnboardingLayout";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";

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
  const { updateUser, user } = useAuth();
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRedirectedRef = useRef(false);

  // Auto-redirect to home after 2 seconds
  useEffect(() => {
    redirectTimerRef.current = setTimeout(() => {
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        router.push('/home');
      }
    }, 2000);

    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, [router]);

  // Handle manual redirect when button is clicked
  const handleContinueClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
    }
    if (!hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.push('/home');
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
          <h1
            className="font-urbanist text-lg md:text-4xl lg:text-5xl font-700 text-charcoal mb-4 tracking-tight leading-snug"
            aria-live="polite"
            style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          >
            You&apos;re all set!
          </h1>
          <p className="text-base md:text-lg font-normal text-charcoal/70 mb-4 leading-relaxed" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            Time to discover what&apos;s out there.
          </p>

          {/* Floating graphics (non-interactive now) */}
          <div className="relative mx-auto mb-4 h-28 w-full max-w-[420px]" aria-hidden="true">
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute bottom-0 left-[15%] w-14 h-14 rounded-full bg-off-white/90 border-2 border-coral flex items-center justify-center float-anim shadow-[0_8px_24px_rgba(0,0,0,0.06)] pointer-events-none select-none">
                <Smile className="w-5 h-5 text-charcoal" aria-hidden="true" />
              </div>
              <div className="absolute bottom-0 left-[45%] w-14 h-14 rounded-full bg-off-white/90 border-2 border-sage flex items-center justify-center float-anim delay-400 shadow-[0_8px_24px_rgba(0,0,0,0.06)] pointer-events-none select-none">
                <Star className="w-5 h-5 text-charcoal" aria-hidden="true" />
              </div>
              <div className="absolute bottom-0 left-[75%] w-14 h-14 rounded-full bg-off-white/90 border-2 border-coral flex items-center justify-center float-anim delay-800 shadow-[0_8px_24px_rgba(0,0,0,0.06)] pointer-events-none select-none">
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
                  group relative block w-[200px] mx-auto rounded-full py-4 px-4 text-body font-semibold text-white text-center flex items-center justify-center bg-gradient-to-r from-coral to-coral/80 hover:from-sage hover:to-sage transition-all duration-300 btn-target btn-press focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/30 focus-visible:ring-offset-2
                "
              >
                Continue to Home
                <ArrowRight className="w-5 h-5 ml-2 inline-block" />
              </span>
            </button>
          </div>

          {/* Completion badge */}
          <div className="mt-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sage/10 border border-sage/30 rounded-full">
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