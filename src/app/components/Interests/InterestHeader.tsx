"use client";

import { Fontdiner_Swanky } from "next/font/google";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

interface InterestHeaderProps {
  isOnline: boolean;
}

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
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 enter-fade" style={{ animationDelay: "0.1s" }}>
          <div
            className="bg-gradient-to-br from-orange-50/95 to-orange-50/90 border border-orange-200/60 rounded-full px-3 py-1 flex items-center gap-2 ring-1 ring-orange-200/30 backdrop-blur-sm"
            style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
          >
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-sm sm:text-xs font-semibold text-orange-700">Offline</span>
          </div>
        </div>
      )}

      <div className="text-center mb-4 pt-4 sm:pt-6 enter-fade title-no-break" style={{ animationDelay: "0.05s" }}>
        <div className="inline-block relative mb-2">
          <WavyTypedTitle
            text="What interests you?"
            as="h2"
            className={`${swanky.className} text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-center leading-snug px-6 sm:px-4 md:px-2 tracking-tight text-charcoal`}
            typingSpeedMs={40}
            startDelayMs={300}
            waveVariant="subtle"
            loopWave={false}
            style={{ 
              fontFamily: swanky.style.fontFamily,
            }}
          />
        </div>
        <p
          className="text-sm md:text-base font-normal text-charcoal/70 leading-relaxed px-4 max-w-lg md:max-w-lg mx-auto"
          style={bodyStyle}
        >
          Pick a few things you love and let&apos;s personalise your experience!
        </p>
      </div>
    </>
  );
}
