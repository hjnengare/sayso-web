// src/components/Hero/HeroSkeleton.tsx
"use client";

export default function HeroSkeleton() {
  return (
    <div className="relative w-full px-0 py-0 md:pt-2 md:px-2">

      {/* Hero Section Skeleton — matches HeroCarousel exactly */}
      <section className="relative h-[90dvh] md:h-[80dvh] w-full overflow-hidden outline-none rounded-none md:rounded-none lg:rounded-none min-h-[300px] shadow-md">
        {/* Background shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-none animate-pulse" />

        {/* Liquid Glass Ambient Lighting */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-sage/10 pointer-events-none rounded-none md:rounded-none lg:rounded-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] pointer-events-none rounded-none md:rounded-none lg:rounded-none" />
        <div className="absolute inset-0 backdrop-blur-[1px] bg-off-white/5 mix-blend-overlay pointer-events-none rounded-none md:rounded-none lg:rounded-none" />

        {/* Overlay gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
        <div className="absolute inset-0 bg-black/20" />

        {/* Centered content skeleton — matches hero text positioning */}
        <div className="absolute inset-0 z-20 flex items-center justify-center w-full pt-[var(--header-height)] -translate-y-4">
          <div className="w-full flex flex-col items-center justify-center text-center pb-20">
            {/* Title skeleton — single h2 line: text-3xl sm:text-4xl lg:text-5xl */}
            <div className="h-9 sm:h-10 lg:h-12 bg-white/40 rounded-lg w-64 sm:w-80 lg:w-96 mx-auto animate-pulse mb-4" />

            {/* Description skeleton — single p line: text-base sm:text-lg lg:text-xl, max-w-xl */}
            <div className="h-5 sm:h-6 lg:h-7 bg-white/30 rounded w-72 sm:w-96 lg:w-[28rem] max-w-xl mx-auto animate-pulse mb-6" />

            {/* CTA Button skeleton — py-3 px-12 rounded-full min-w-[180px] */}
            <div className="h-12 bg-white/35 rounded-full w-[180px] mx-auto animate-pulse" />
          </div>
        </div>
      </section>
    </div>
  );
}
