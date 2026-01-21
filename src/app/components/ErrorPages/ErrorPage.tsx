"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { IoArrowBack, IoHome } from "react-icons/io5";
import FadeInUp from "../Animations/FadeInUp";
import PremiumHover from "../Animations/PremiumHover";

export type ErrorType = "404" | "401" | "403" | "500" | "503" | "error";

interface ErrorPageProps {
  errorType?: ErrorType;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  primaryAction?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  showContactSupport?: boolean;
  supportEmail?: string;
}

/**
 * Unified Error Page Component
 * 
 * Design Principles:
 * - Premium, minimal, intentional design
 * - Uses core color palette: Sage (#7D9B76), navbar-bg (#722F37), off-white (#E5E0E5)
 * - Consistent typography and spacing with site design language
 * - Natural extension of the product, not an afterthought
 */
export default function ErrorPage({
  errorType = "error",
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  showContactSupport = true,
  supportEmail = "support@sayso.com",
}: ErrorPageProps) {
  // Default configurations for each error type
  const errorConfig = {
    "404": {
      title: "Page Not Found",
      description:
        "The page you're looking for seems to have wandered off. Let's get you back on track.",
      defaultPrimaryAction: {
        label: "Go Home",
        href: "/interests",
        icon: <IoHome className="w-5 h-5" />,
      },
      icon: (
        <span className="text-7xl md:text-8xl font-800 text-transparent bg-clip-text bg-gradient-to-r from-charcoal via-sage to-charcoal">
          404
        </span>
      ),
    },
    "401": {
      title: "Authentication Required",
      description:
        "You need to sign in to access this page. Let's get you logged in.",
      defaultPrimaryAction: {
        label: "Sign In",
        href: "/login",
        icon: <IoHome className="w-5 h-5" />,
      },
      icon: (
        <span className="text-7xl md:text-8xl font-800 text-transparent bg-clip-text bg-gradient-to-r from-charcoal via-sage to-charcoal">
          401
        </span>
      ),
    },
    "403": {
      title: "Access Denied",
      description: "You don't have permission to access this resource.",
      defaultPrimaryAction: {
        label: "Go Home",
        href: "/interests",
        icon: <IoHome className="w-5 h-5" />,
      },
      icon: (
        <span className="text-7xl md:text-8xl font-800 text-transparent bg-clip-text bg-gradient-to-r from-charcoal via-sage to-charcoal">
          403
        </span>
      ),
    },
    "500": {
      title: "Server Error",
      description:
        "Something went wrong on our end. Our team has been notified and is working on it.",
      defaultPrimaryAction: {
        label: "Go Home",
        href: "/interests",
        icon: <IoHome className="w-5 h-5" />,
      },
      icon: (
        <span className="text-7xl md:text-8xl font-800 text-transparent bg-clip-text bg-gradient-to-r from-charcoal via-sage to-charcoal">
          500
        </span>
      ),
    },
    "503": {
      title: "Service Unavailable",
      description:
        "We're temporarily down for maintenance. We'll be back shortly.",
      defaultPrimaryAction: {
        label: "Check Status",
        href: "/",
        icon: <IoHome className="w-5 h-5" />,
      },
      icon: (
        <span className="text-7xl md:text-8xl font-800 text-transparent bg-clip-text bg-gradient-to-r from-charcoal via-sage to-charcoal">
          503
        </span>
      ),
    },
    error: {
      title: "Something Went Wrong",
      description: "We encountered an unexpected error. Please try again.",
      defaultPrimaryAction: {
        label: "Go Home",
        href: "/interests",
        icon: <IoHome className="w-5 h-5" />,
      },
      icon: (
        <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center border border-sage/20">
          <div className="w-8 h-8 rounded-full border-2 border-sage border-t-transparent animate-spin" />
        </div>
      ),
    },
  };

  const config = errorConfig[errorType];
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalIcon = icon !== undefined ? icon : config.icon;
  const finalPrimaryAction = primaryAction || config.defaultPrimaryAction;

  return (
    <div
      className="min-h-dvh bg-off-white relative overflow-hidden font-urbanist"
      style={{
        fontFamily:
          "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      {/* Subtle background gradient accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sage/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sage/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-dvh px-4 py-8">
        <div className="text-center max-w-lg mx-auto">
          {/* Error Icon */}
          <FadeInUp delay={0.1}>
            <motion.div
              className="relative mb-8 flex justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {finalIcon}
            </motion.div>
          </FadeInUp>

          {/* Title */}
          <FadeInUp delay={0.2}>
            <h1 className="font-urbanist text-2xl md:text-4xl font-700 text-charcoal mb-4">
              {finalTitle}
            </h1>
          </FadeInUp>

          {/* Description */}
          <FadeInUp delay={0.3}>
            <p className="font-urbanist text-base md:text-lg font-500 text-charcoal/70 mb-8 max-w-lg mx-auto leading-relaxed">
              {finalDescription}
            </p>
          </FadeInUp>

          {/* Action Buttons */}
          <FadeInUp delay={0.4}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto mb-8">
              {/* Primary Action */}
              <PremiumHover scale={1.02}>
                <Link
                  href={finalPrimaryAction.href}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto py-4 px-8 bg-sage hover:bg-sage/90 text-white font-urbanist font-600 text-base rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-sage/20 group"
                >
                  {finalPrimaryAction.icon}
                  <span>{finalPrimaryAction.label}</span>
                </Link>
              </PremiumHover>

              {/* Secondary Action */}
              {secondaryAction && (
                <PremiumHover scale={1.02}>
                  <button
                    onClick={secondaryAction.onClick}
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto py-4 px-8 bg-off-white/80 backdrop-blur-sm text-charcoal font-urbanist font-600 text-base rounded-lg border border-sage/20 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-white/90 group"
                  >
                    {secondaryAction.icon}
                    <span>{secondaryAction.label}</span>
                  </button>
                </PremiumHover>
              )}
            </div>
          </FadeInUp>

          {/* Support Contact */}
          {showContactSupport && (
            <FadeInUp delay={0.5}>
              <div className="pt-8 border-t border-sage/10">
                <p className="font-urbanist text-sm font-500 text-charcoal/70">
                  Need help?{" "}
                  <a
                    href={`mailto:${supportEmail}`}
                    className="text-sage hover:text-sage/80 font-600 transition-colors"
                  >
                    Contact support
                  </a>
                </p>
              </div>
            </FadeInUp>
          )}
        </div>
      </div>
    </div>
  );
}
