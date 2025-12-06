import React from "react";

interface WelcomeSectionProps {
  delay?: number;
}

export function WelcomeSection({ delay = 100 }: WelcomeSectionProps) {
  return (
    <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-md border border-white/50 rounded-[12px] ring-1 ring-white/20 p-6 relative overflow-hidden animate-fade-in-up animate-delay-100">
      <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg" />
      <div className="relative z-10">
        <h2 className="font-urbanist text-xl font-700 text-charcoal mb-2">Welcome back!</h2>
        <p className="font-urbanist text-charcoal/70 text-sm">Manage your business profiles, respond to reviews, and track your performance.</p>
      </div>
    </div>
  );
}
