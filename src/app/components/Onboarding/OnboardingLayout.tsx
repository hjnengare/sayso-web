"use client";

import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { ArrowLeft } from "react-feather";

// Shared CSS animations for all onboarding pages
const globalAnimations = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes progressBarGrow {
    from {
      transform: scaleX(0);
    }
    to {
      transform: scaleX(1);
    }
  }

  /* Animation classes */
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }

  .animate-slide-in-left {
    animation: slideInLeft 0.6s ease-out forwards;
  }

  .animate-scale-in {
    animation: scaleIn 0.8s ease-out forwards;
  }

  .delay-100 {
    animation-delay: 0.1s;
    opacity: 0;
  }

  .delay-500 {
    animation-delay: 0.5s;
    opacity: 0;
  }

  /* Progress indicator animation */
  .progress-active {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.1);
    }
  }

  /* Progress bar animation */
  .progress-bar-fill {
    animation: progressBarGrow 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    transform-origin: left;
  }

  /* Respect reduced motion preferences */
  @media (prefers-reduced-motion: reduce) {
    .animate-fade-in-up,
    .animate-slide-in-left,
    .animate-scale-in,
    .progress-active,
    .progress-bar-fill {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
  }

  /* Safe area support */
  .pb-safe-area-bottom {
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }

  .mb-safe-interaction {
    margin-bottom: max(1rem, env(safe-area-inset-bottom));
  }

  .safe-area-container {
    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
    padding-top: max(1rem, env(safe-area-inset-top));
  }

`;


interface OnboardingLayoutProps {
  children: ReactNode;
  backHref?: string;
  step: number;
  totalSteps?: number;
  showProgress?: boolean;
}

export default function OnboardingLayout({
  children,
  backHref,
  step,
  totalSteps = 4,
  showProgress = true,
}: OnboardingLayoutProps) {
  const router = useRouter();
  const progressPercentage = (step / totalSteps) * 100;

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (backHref) {
      router.push(backHref);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalAnimations }} />
      <div className="min-h-dvh bg-off-white flex flex-col px-4 py-4 pb-safe-area-bottom relative overflow-y-auto onboarding-enter safe-area-container" style={{ contain: 'layout style paint' }}>

        {/* Linear Progress Bar at Top */}
        {showProgress && (
          <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-charcoal/10">
            <div
              className="h-full bg-sage transition-all duration-700 ease-out progress-bar-fill"
              style={{ width: `${progressPercentage}%` }}
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={totalSteps}
              aria-label={`Step ${step} of ${totalSteps}`}
            />
          </div>
        )}

        {/* Back button */}
        {backHref && (
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 animate-fade-in-up delay-100">
            <button
              onClick={handleBackClick}
              aria-label="Go back"
              className="text-white hover:text-white transition-all duration-300 p-2 bg-navbar-bg/90 hover:bg-navbar-bg rounded-full block md:backdrop-blur-xl border border-navbar-bg/60 hover:border-navbar-bg cursor-pointer"
            >
              {/* ✅ Lucide back arrow */}
              <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Main content */}
        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto relative z-10 flex-1 flex flex-col justify-center py-4 onboarding-content">
          {children}
        </div>

        {/* Progress indicator */}
        {showProgress && (
          <div className="animate-fade-in-up delay-500 mb-safe-interaction">
            <div className="flex justify-center items-center space-x-2 mt-2">
              {Array.from({ length: totalSteps }).map((_, index) => {
                const isActive = index + 1 === step;
                const isCompleted = index + 1 < step;

                return (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-500 ${
                      isActive
                        ? "bg-sage progress-active"
                        : isCompleted
                        ? "bg-sage/60"
                        : "bg-charcoal/20"
                    }`}
                  />
                );
              })}
            </div>

            <div className="text-center mt-1">
              <p className="text-sm sm:text-xs font-600 text-charcoal/50" style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}>
                Step {step} of {totalSteps}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
