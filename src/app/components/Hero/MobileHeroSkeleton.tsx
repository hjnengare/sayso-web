// src/components/Hero/MobileHeroSkeleton.tsx
"use client";

export default function MobileHeroSkeleton() {
  return (
    <div className="relative w-full px-0 py-0">
      {/* Mobile Hero Section Skeleton - matches mobile HeroCarousel exactly */}
      <section className="relative h-[100dvh] w-full overflow-hidden outline-none rounded-none min-h-[420px]">
        {/* Background shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-none animate-pulse" />

        {/* Liquid Glass Ambient Lighting */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-sage/10 pointer-events-none rounded-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] pointer-events-none rounded-none" />
        <div className="absolute inset-0 backdrop-blur-[1px] bg-off-white/5 mix-blend-overlay pointer-events-none rounded-none" />

        {/* Overlay gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
        <div className="absolute inset-0 bg-black/20" />

        {/* Centered content skeleton - matches mobile hero text positioning */}
        <div className="absolute inset-0 z-20 flex items-center justify-center w-full pt-[var(--safe-area-top)] translate-y-0 px-6">
          <div className="w-full max-w-3xl flex flex-col items-center justify-center text-center pb-12">
            {/* Title skeleton - mobile text-3xl */}
            <div className="h-8 bg-white/40 rounded-lg w-60 mx-auto animate-pulse mb-3" />

            {/* Description skeleton - mobile text-base */}
            <div className="h-[26px] bg-white/30 rounded w-72 max-w-xl mx-auto animate-pulse mb-5" />

            {/* CTA Button skeleton - mobile full width with max-w-[320px] */}
            <div className="h-12 bg-white/35 rounded-full w-full max-w-[320px] mx-auto animate-pulse" />
          </div>
        </div>
      </section>
    </div>
  );
}
