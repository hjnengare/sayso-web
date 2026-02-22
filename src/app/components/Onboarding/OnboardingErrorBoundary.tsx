"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { m } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for onboarding flow
 * Catches errors in onboarding components and displays user-friendly message
 * Uses unified error design system
 */
class OnboardingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[OnboardingErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-off-white font-urbanist">
          {/* Subtle background gradient accent */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-card-bg/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-card-bg/3 rounded-full blur-3xl" />
          </div>

          <m.div 
            className="max-w-md w-full relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 border border-sage/10 shadow-sm">
              {/* Error Icon */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-card-bg/10 flex items-center justify-center border border-sage/20 flex-shrink-0">
                  <div className="w-5 h-5 rounded-full border-2 border-sage border-t-transparent animate-spin" />
                </div>
                <h2 className="text-lg font-700 text-charcoal">
                  Something went wrong
                </h2>
              </div>

              {/* Error Description */}
              <p className="text-charcoal/70 mb-8 text-sm md:text-base leading-relaxed">
                We encountered an error while loading the onboarding flow. Please try refreshing the page.
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3 flex-col sm:flex-row">
                <button
                  onClick={this.handleReset}
                  className="flex-1 px-4 py-3 bg-card-bg text-white rounded-lg font-600 hover:bg-card-bg/90 transition-all duration-300 font-urbanist focus:outline-none focus:ring-2 focus:ring-sage/30 active:scale-95"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-4 py-3 bg-charcoal/10 text-charcoal rounded-lg font-600 hover:bg-charcoal/15 transition-all duration-300 font-urbanist border border-charcoal/10 focus:outline-none focus:ring-2 focus:ring-charcoal/30 active:scale-95"
                >
                  Refresh Page
                </button>
              </div>

              {/* Development Error Details */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 pt-6 border-t border-sage/10">
                  <summary className="text-sm font-600 text-sage cursor-pointer hover:text-sage/80 transition-colors">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-3 text-xs bg-card-bg/5 p-3 rounded font-mono text-charcoal/60 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                    {this.state.error.toString()}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            {/* Support Contact */}
            <div className="mt-6 text-center">
              <p className="font-urbanist text-sm font-500 text-charcoal/70">
                Continue having issues?{" "}
                <a
                  href="mailto:support@sayso.com"
                  className="text-sage hover:text-sage/80 font-600 transition-colors"
                >
                  Contact support
                </a>
              </p>
            </div>
          </m.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { OnboardingErrorBoundary };

