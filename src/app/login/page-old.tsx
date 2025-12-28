"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { ArrowLeft, Mail, AlertCircle, CheckCircle, Lock, Eye, EyeOff, ShieldCheck, Users, Star } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// Mobile-first CSS with proper typography scale and safe areas
const styles = `
  /* Mobile-first typography scale - Body text ≥ 16px */
  .text-body { font-size: 1rem; line-height: 1.5; } /* 16px */
  .text-body-lg { font-size: 1.125rem; line-height: 1.5; } /* 18px */
  .text-heading-sm { font-size: 1.25rem; line-height: 1.4; } /* 20px */
  .text-heading-md { font-size: 1.5rem; line-height: 1.3; } /* 24px */
  .text-heading-lg { font-size: 1.875rem; line-height: 1.2; } /* 30px */

  /* iOS inertia scrolling and prevent double scroll */
  .ios-inertia {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    min-height: 0;
  }

  /* Hide scrollbar */
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }

  /* Button press states - 44-48px targets */
  .btn-press:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }

  .btn-target {
    min-height: 44px;
    min-width: 44px;
    touch-action: manipulation;
  }

  /* Premium button styling */
  .btn-premium {
    position: relative;
    background: linear-gradient(135deg, #7D9B76 0%, #6B8A64 100%);
    box-shadow:
      0 10px 40px rgba(125, 155, 118, 0.25),
      0 4px 12px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
  }

  .btn-premium:hover {
    transform: translateY(-2px);
    box-shadow:
      0 20px 60px rgba(125, 155, 118, 0.35),
      0 8px 24px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .btn-premium:active {
    transform: translateY(0);
  }

  /* Input styling - 16px+ to prevent auto-zoom */
  .input-mobile {
    font-size: 1rem !important; /* 16px minimum */
    min-height: 48px;
    touch-action: manipulation;
  }

  /* Card styling - border-first, tiny shadow (no heavy blur) */
  .card-mobile {
    border: 1px solid rgba(0, 0, 0, 0.08) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  /* Text truncation support */
  .text-truncate {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Full-screen pattern - respects notches */
  .full-screen {
    min-height: 100dvh;
    min-height: 100vh; /* fallback */
  }

  /* Safe area padding */
  .safe-area-full {
    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
    padding-top: max(1.5rem, env(safe-area-inset-top));
    padding-bottom: max(6rem, env(safe-area-inset-bottom));
  }

  /* Prevent layout jumps */
  .stable-layout {
    contain: layout style;
  }

  /* Fixed aspect ratios for images */
  .aspect-square { aspect-ratio: 1 / 1; }
  .aspect-video { aspect-ratio: 16 / 9; }
  .aspect-photo { aspect-ratio: 4 / 3; }

  /* Carousel patterns for mobile */
  @media (max-width: 768px) {
    .carousel-mobile {
      scroll-snap-type: x mandatory;
      overflow-x: auto;
      display: flex;
    }

    .carousel-item {
      scroll-snap-align: center;
      flex-shrink: 0;
    }
  }

  /* CSS Animations */
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

  .animate-delay-200 {
    animation-delay: 0.2s;
    opacity: 0;
  }

  .animate-delay-400 {
    animation-delay: 0.4s;
    opacity: 0;
  }

  .animate-delay-700 {
    animation-delay: 0.7s;
    opacity: 0;
  }
`;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isLoading: authLoading, error: authError } = useAuth();
  const isLoading = false; // Disabled for UI/UX design
  const { showToast } = useToast();

  const containerRef = useRef(null);

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getEmailError = () => {
    if (!emailTouched) return "";
    if (!email) return "Email is required";
    if (!validateEmail(email)) return "Please enter a valid email address";
    return "";
  };

  const getPasswordError = () => {
    if (!passwordTouched) return "";
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Mark fields as touched for validation
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!email || !password) {
      setError("Please fill in all fields");
      showToast("Please fill in all fields", 'sage', 3000);
      setIsSubmitting(false);
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      showToast("Please enter a valid email address", 'sage', 3000);
      setIsSubmitting(false);
      return;
    }

    try {
      const success = await login(email, password);
      if (success) {
        showToast("Welcome back! Redirecting...", 'success', 2000);
      } else {
        const errorMsg = authError || "Invalid email or password";
        setError(errorMsg);
        showToast(errorMsg, 'sage', 4000);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      setError(errorMsg);
      showToast(errorMsg, 'sage', 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div ref={containerRef} className="min-h-[100dvh]  bg-off-white   flex flex-col relative overflow-hidden ios-inertia hide-scrollbar safe-area-full">
      {/* Back button with entrance animation */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 animate-slide-in-left animate-delay-200">
        <Link href="/onboarding" className="text-charcoal hover:text-charcoal/80 transition-colors duration-300 p-2 hover:bg-off-white/50 rounded-lg block backdrop-blur-sm">
          <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
        </Link>
      </div>


      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12">
        {/* Header with premium styling and animations */}
        <div className="text-center mb-4">
          <div className="inline-block relative mb-4 animate-fade-in-up animate-delay-400">
            <h2 className="text-xl sm:text-lg md:text-lg lg:text-4xl font-bold text-charcoal mb-2 text-center leading-snug px-2 tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>
              Welcome back
            </h2>
          </div>
          <p className="text-sm md:text-base font-normal text-charcoal/70 mb-4 leading-relaxed px-2 max-w-lg mx-auto animate-fade-in-up animate-delay-700" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>
            Sign in to continue discovering sayso
          </p>
        </div>


        {/* Form Card */}
        <div
          className="
            bg-off-white/95 rounded-lg p-5 sm:p-7 md:p-9 mb-4 relative overflow-hidden
            border border-white/30 backdrop-blur-lg
            shadow-[0_10px_30px_rgba(0,0,0,0.06),0_22px_70px_rgba(0,0,0,0.10)]
            hover:shadow-[0_12px_36px_rgba(0,0,0,0.08),0_30px_90px_rgba(0,0,0,0.14)]
            transition-shadow duration-300
            animate-scale-in
          "
        >
          
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-[20px] p-4 text-center">
                <p className="font-urbanist text-[14px] font-600 text-red-600">{error}</p>
              </div>
            )}

            {/* Email with icon */}
            <div className="relative group">
              <div className={`absolute left-4 sm:left-5 top-1/2 transform -translate-y-1/2 transition-colors duration-300 z-10 ${
                getEmailError() ? 'text-red-500' :
                email && !getEmailError() ? 'text-sage' :
                'text-charcoal/40 group-focus-within:text-sage'
              }`}>
                {getEmailError() ? <AlertCircle className="w-5 h-5" /> :
                  email && !getEmailError() ? <CheckCircle className="w-5 h-5" /> :
                  <Mail className="w-5 h-5" />}
              </div>
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (!emailTouched) setEmailTouched(true);
                }}
                onBlur={() => setEmailTouched(true)}
                className={`w-full bg-cultured-1/50 border pl-12 sm:pl-14 pr-4 py-3 sm:py-4 md:py-5 font-urbanist text-body font-600 text-charcoal placeholder-charcoal/50 focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile ${
                  getEmailError() ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' :
                  email && !getEmailError() ? 'border-sage/40 focus:border-sage focus:ring-sage/20' :
                  'border-light-gray/50 focus:ring-sage/30 focus:border-sage focus:bg-off-white  '
                }`}
                disabled={isSubmitting || isLoading}
              />
            </div>

            {/* Email validation feedback */}
            {getEmailError() && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1" role="alert">
                <AlertCircle className="w-3 h-3" />
                {getEmailError()}
              </p>
            )}
            {email && !getEmailError() && emailTouched && (
              <p className="text-xs text-sage flex items-center gap-1 mt-1" role="status">
                <CheckCircle className="w-3 h-3" />
                Email looks good!
              </p>
            )}

            {/* Password with enhanced styling */}
            <div className="relative group">
              <div className={`absolute left-4 sm:left-5 top-1/2 transform -translate-y-1/2 transition-colors duration-300 z-10 ${
                getPasswordError() ? 'text-red-500' :
                password && !getPasswordError() ? 'text-sage' :
                'text-charcoal/40 group-focus-within:text-sage'
              }`}>
                {getPasswordError() ? <AlertCircle className="w-5 h-5" /> :
                  password && !getPasswordError() ? <CheckCircle className="w-5 h-5" /> :
                  <Lock className="w-5 h-5" />}
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (!passwordTouched) setPasswordTouched(true);
                }}
                onBlur={() => setPasswordTouched(true)}
                className={`w-full bg-cultured-1/50 border pl-12 sm:pl-14 pr-12 sm:pr-16 py-3 sm:py-4 md:py-5 font-urbanist text-body font-600 text-charcoal placeholder-charcoal/50 focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile ${
                  getPasswordError() ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' :
                  password && !getPasswordError() ? 'border-sage/40 focus:border-sage focus:ring-sage/20' :
                  'border-light-gray/50 focus:ring-sage/30 focus:border-sage focus:bg-off-white  '
                }`}
                disabled={isSubmitting || isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 sm:right-5 top-1/2 transform -translate-y-1/2 text-charcoal/40 hover:text-charcoal transition-colors duration-300 p-1 z-10 rounded-full"
                disabled={isSubmitting || isLoading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password validation feedback */}
            {getPasswordError() && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1" role="alert">
                <AlertCircle className="w-3 h-3" />
                {getPasswordError()}
              </p>
            )}
            {password && !getPasswordError() && passwordTouched && (
              <p className="text-xs text-sage flex items-center gap-1 mt-1" role="status">
                <CheckCircle className="w-3 h-3" />
                Password looks good!
              </p>
            )}

            {/* Forgot Password */}
            <div className="text-right">
              <Link
                href="#"
                className="font-urbanist text-base font-500 text-coral hover:text-coral/80 transition-colors duration-300"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button with premium effects */}
            <div className="pt-4 flex justify-center">
              <div className="w-full">
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading || !!getEmailError() || !!getPasswordError() || !email || !password}
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
                  className={`group block w-full text-base font-semibold py-3 px-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 relative overflow-hidden text-center min-h-[48px] whitespace-nowrap transform hover:scale-105 active:scale-95 ${
                    isSubmitting || isLoading || !!getEmailError() || !!getPasswordError() || !email || !password
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                      : 'btn-premium text-white focus:ring-sage/30'
                  }`}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {(isSubmitting || isLoading) && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    )}
                    {isSubmitting || isLoading ? "Signing in..." : "Sign In"}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-coral to-coral/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-light-gray/50"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4  bg-off-white   text-charcoal/60 font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>or continue with</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              <button
                type="button"
                className="flex items-center justify-center bg-off-white border border-light-gray/50 rounded-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 text-sm font-medium text-charcoal hover:border-sage/50 hover:bg-sage/5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 group btn-target btn-press"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="group-hover:text-sage transition-colors duration-300">Google</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center bg-off-white   border border-light-gray/50 rounded-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 text-sm font-medium text-charcoal hover:border-sage/50 hover:bg-sage/5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sage/30 group btn-target btn-press"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span className="group-hover:text-sage transition-colors duration-300">Apple</span>
              </button>
            </div>
          </form>

          {/* Enhanced footer */}
          <div className="text-center mt-4 pt-4 border-t border-light-gray/30">
            <div className="font-urbanist text-sm sm:text-base font-600 text-charcoal/70">
              {"Don't have an account? "}
              <Link
                href="/register"
                className="text-coral font-600 hover:text-coral/80 transition-colors duration-300 relative group"
              >
                <span>Sign up</span>
                <div className="absolute inset-x-0 -bottom-1 h-0.5 bg-coral/30 group-hover:bg-coral/60 transition-colors duration-300 rounded-full"></div>
              </Link>
            </div>
          </div>
        </div>

      
      </div>
      </div>
    </>
  );
}
