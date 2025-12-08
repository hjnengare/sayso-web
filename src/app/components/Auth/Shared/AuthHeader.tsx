"use client";

import Link from "next/link";
import { ArrowLeft } from "react-feather";

interface AuthHeaderProps {
  backLink: string;
  title: string;
  subtitle: string;
  subtitleStyle?: React.CSSProperties;
}

export function AuthHeader({ backLink, title, subtitle, subtitleStyle }: AuthHeaderProps) {
  const titleStyle = {
    fontFamily: '"Urbanist", system-ui, sans-serif',
  } as React.CSSProperties;
  const bodyStyle = {
    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    fontWeight: 400,
    ...subtitleStyle,
  } as React.CSSProperties;

  return (
    <>
      {/* Back button with entrance animation */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 animate-slide-in-left animate-delay-200">
        <Link href={backLink} className="text-charcoal hover:text-charcoal/80 transition-colors duration-300 p-2 hover:bg-off-white/50 rounded-lg block backdrop-blur-sm">
          <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
        </Link>
      </div>

      {/* Header with premium styling and animations */}
      <div className="text-center mb-4">
        <div className="inline-block relative mb-4 animate-fade-in-up animate-delay-400">
          <h2 className="text-3xl md:text-4xl font-semibold text-charcoal mb-2 text-center leading-[1.2] px-2 tracking-tight" style={titleStyle}>
            {title}
          </h2>
        </div>
        <p className="text-body font-normal text-charcoal/70 mb-4 leading-[1.55] px-2 max-w-[70ch] mx-auto animate-fade-in-up animate-delay-700" style={bodyStyle}>
          {subtitle}
        </p>
      </div>
    </>
  );
}
