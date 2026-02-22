"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { m } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Report to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Here you would send to error reporting service
      // e.g., Sentry, LogRocket, etc.
    }

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      retryCount: prevState.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isRepeatedError = this.state.retryCount >= 2;

      return (
        <div 
          className="min-h-dvh flex items-center justify-center bg-off-white px-4 font-urbanist"
          style={{
            fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          }}
        >
          {/* Subtle background gradient accent */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-card-bg/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-card-bg/3 rounded-full blur-3xl" />
          </div>

          <m.div 
            className="max-w-md w-full text-center relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto mb-8 rounded-full bg-card-bg/10 flex items-center justify-center border border-sage/20">
              <div className="w-8 h-8 rounded-full border-2 border-sage border-t-transparent animate-spin" />
            </div>

            {/* Error Title */}
            <h1 className="font-urbanist text-xl md:text-2xl font-700 text-charcoal mb-3">
              {isRepeatedError ? 'Persistent Error' : 'Something went wrong'}
            </h1>

            {/* Error Description */}
            <p className="font-urbanist text-sm md:text-base text-charcoal/70 mb-8 leading-relaxed">
              {isRepeatedError
                ? 'We\'re experiencing technical difficulties. Please contact support if this continues.'
                : 'We encountered an unexpected error. Please try again.'
              }
            </p>

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left bg-card-bg/5 p-4 rounded-lg border border-sage/10">
                <summary className="font-urbanist text-sm font-600 text-sage cursor-pointer hover:text-sage/80 transition-colors">
                  Error Details (Dev Only)
                </summary>
                <pre className="mt-3 text-xs text-charcoal/60 whitespace-pre-wrap overflow-auto max-h-40 font-mono">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                disabled={isRepeatedError}
                className={`w-full font-urbanist text-base font-600 py-3 px-6 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 ${
                  isRepeatedError
                    ? 'bg-charcoal/10 text-charcoal/50 cursor-not-allowed'
                    : 'bg-card-bg text-white hover:bg-card-bg/90 active:scale-95'
                }`}
              >
                {isRepeatedError ? 'Unable to Retry' : 'Try Again'}
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-charcoal/10 text-charcoal font-urbanist text-base font-600 py-3 px-6 rounded-lg hover:bg-charcoal/15 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-charcoal/30 active:scale-95 border border-charcoal/10"
              >
                Go to Home
              </button>
            </div>

            {/* Support Contact */}
            <div className="mt-8 pt-6 border-t border-sage/10">
              <p className="font-urbanist text-sm font-500 text-charcoal/70">
                Need help?{" "}
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

export default ErrorBoundary;
