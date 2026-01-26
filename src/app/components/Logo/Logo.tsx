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
    default: "h-14 sm:h-16 md:h-18 lg:h-20",
    mobile: "h-12",
    footer: "h-10 sm:h-11 lg:h-12",
    onboarding: "h-16 sm:h-18 md:h-20 lg:h-24"
  };

  return (
    <div className={`flex items-center ${className}`}>
      {/* Logo mark */}
      <div className={`relative aspect-[3/2] ${containerClasses[variant]}`}>
        <Image
          src="/logos/new_logo.png"
          alt="Sayso logo"
          fill
          className="object-contain object-center"
          priority
          sizes="(max-width: 640px) 100px, (max-width: 768px) 130px, (max-width: 1024px) 160px, 180px"
        />
      </div>

      {/* Wordmark (pulled super close) */}
      <span
        className="
          -ml-2 sm:-ml-4 md:-ml-4
          text-white italic lowercase
          text-xl sm:text-2xl md:text-3xl
          font-semibold tracking-tight
          leading-none
          select-none
        "
        style={{
          fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
        }}
      >
        sayso
      </span>
    </div>
  );
}
