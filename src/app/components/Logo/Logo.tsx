// src/app/components/Logo/Logo.tsx
"use client";

import React from "react";
import Image from "next/image";
import Wordmark from "./Wordmark";

interface LogoProps {
  variant?: "default" | "mobile" | "footer" | "onboarding";
  className?: string;
  showMark?: boolean;
  wordmarkClassName?: string;
}

export default function Logo({
  variant = "default",
  className = "",
  showMark = true,
  wordmarkClassName = "",
}: LogoProps) {
  const containerClasses = {
    default: "h-18",
    mobile: "h-14",
    footer: "h-16",
    onboarding: "h-20"
  };

  const containerGapClass =
    variant === "footer" ? "gap-2" : variant === "default" ? "gap-4" : "gap-3";
  // Only apply negative margin when the mark image is shown (pulls wordmark closer to icon).
  // Without the image, negative margin pushes the text off-screen on mobile.
  const wordmarkSpacingClass =
    !showMark || variant === "footer" ? "" : "-ml-2 sm:-ml-4 md:-ml-4";

  return (
    <div className={`inline-flex items-center ${containerGapClass} ${className}`}>
      {showMark && (
        <div className={`relative aspect-[3/2] ${containerClasses[variant]}`}>
          <Image
            src="/logos/logo.png"
            alt="Sayso logo"
            fill
            className="object-contain md:object-center sm:object-right object-right"
            priority
            sizes="(max-width: 640px) 120px, (max-width: 768px) 150px, (max-width: 1024px) 180px, 220px"
          />
        </div>
      )}

      {variant !== "footer" && (
        <Wordmark
          size="text-xl sm:text-2xl md:text-3xl"
          className={`tracking-tight ${wordmarkSpacingClass} ${wordmarkClassName}`}
        />
      )}
    </div>
  );
}
