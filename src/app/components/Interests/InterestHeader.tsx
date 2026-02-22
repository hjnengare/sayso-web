"use client";

import { m } from "framer-motion";
import WavyTypedTitle from "@/app/components/Animations/WavyTypedTitle";

interface InterestHeaderProps {
  isOnline: boolean;
}

const headerVariants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.8, 0.25, 1] as [number, number, number, number],
      delay: 0.05,
    },
  },
};

const offlineBadgeVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
      delay: 0.1,
    },
  },
};

export default function InterestHeader({ isOnline }: InterestHeaderProps) {
  const titleStyle = {
    fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  } as React.CSSProperties;
  const bodyStyle = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: 400,
  } as React.CSSProperties;

  return (
    <>
      {!isOnline && (
        <m.div
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20"
          variants={offlineBadgeVariants}
          initial="hidden"
          animate="visible"
        >
          <div
            className="bg-gradient-to-br from-orange-50/95 to-orange-50/90 border border-orange-200/60 rounded-full px-3 py-1 flex items-center gap-2 ring-1 ring-orange-200/30 md:backdrop-blur-sm"
            style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
          >
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-sm sm:text-xs font-semibold text-orange-700">Offline</span>
          </div>
        </m.div>
      )}

      <m.div
        className="text-center mb-4 pt-4 sm:pt-6 title-no-break"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="inline-block relative mb-2">
          <WavyTypedTitle
            text="What interests you?"
            as="h2"
            className="font-urbanist text-2xl md:text-3xl lg:text-4xl font-700 mb-2 text-center leading-snug px-6 sm:px-4 md:px-2 tracking-tight text-charcoal"
            typingSpeedMs={40}
            startDelayMs={300}
            waveVariant="subtle"
            loopWave={false}
            triggerOnTypingComplete={true}
            enableScrollTrigger={false}
            style={{ 
              fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              fontWeight: 700,
            }}
          />
        </div>
        <p
          className="text-sm md:text-base font-normal text-charcoal/70 leading-relaxed px-4 max-w-lg md:max-w-lg mx-auto break-words whitespace-normal"
          style={bodyStyle}
        >
          Pick a few things you love and let&apos;s personalise your experience!
        </p>
      </m.div>
    </>
  );
}
