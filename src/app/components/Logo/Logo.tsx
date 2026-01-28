// src/app/components/Logo/Logo.tsx
"use client";

import React from "react";
import Image from "next/image";

interface LogoProps {
  variant?: "default" | "mobile" | "footer" | "onboarding";
  className?: string;
}

export default function Logo({
  variant = "default",
  className = ""
}: LogoProps) {
  const containerClasses = {
    default: "h-14 sm:h-16 md:h-14 lg:h-18",
    mobile: "h-12",
    footer: "h-10 sm:h-11 lg:h-12",
    onboarding: "h-16 sm:h-18 md:h-20 lg:h-24"
  };

  const containerGapClass =
    variant === "footer" ? "gap-2" : variant === "default" ? "gap-4" : "gap-3";
  const wordmarkSpacingClass =
    variant === "footer" ? "" : "-ml-2 sm:-ml-4 md:-ml-4";

  return (
    <div className={`inline-flex items-center ${containerGapClass} ${className}`}>
      {/* Logo mark */}
      <div className={`relative aspect-[3/2] ${containerClasses[variant]}`}>
        <Image
          src="/logos/logo.png"
          alt="Sayso logo"
          fill
          className="object-contain object-center"
          priority
          sizes="(max-width: 640px) 100px, (max-width: 768px) 130px, (max-width: 1024px) 160px, 180px"
        />
      </div>

      {variant !== "footer" && (
        <span
          className={`${wordmarkSpacingClass} text-white italic lowercase text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight leading-none select-none`}
          style={{
            fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
          }}
        >
          sayso
        </span>
      )}
    </div>
  );
}
