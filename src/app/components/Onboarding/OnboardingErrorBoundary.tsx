"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

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
        <div className="min-h-screen flex items-center justify-center p-4 bg-off-white">
          <div className="max-w-md w-full bg-white rounded-[20px] p-6 shadow-lg border border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-semibold text-charcoal">
                Something went wrong
              </h2>
            </div>
            <p className="text-charcoal/70 mb-6">
              We encountered an error while loading the onboarding flow. Please try refreshing the page.
            </p>
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-sage text-white rounded-full font-medium hover:bg-sage/90 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-charcoal/10 text-charcoal rounded-full font-medium hover:bg-charcoal/20 transition-colors"
              >
                Refresh Page
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="text-sm text-charcoal/60 cursor-pointer">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs bg-charcoal/5 p-3 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { OnboardingErrorBoundary };

