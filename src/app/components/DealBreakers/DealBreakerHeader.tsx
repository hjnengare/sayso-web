"use client";

import { Fontdiner_Swanky } from "next/font/google";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export default function DealBreakerHeader() {
  const bodyStyle = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: 400,
  } as React.CSSProperties;

  return (
    <div className="text-center mb-6 pt-4 sm:pt-6 enter-fade title-no-break">
      <WavyTypedTitle
        text="What are your deal-breakers?"
        as="h2"
        className={`${swanky.className} text-2xl md:text-3xl lg:text-4xl font-bold mb-2 tracking-tight px-6 sm:px-4 md:px-2 text-charcoal`}
        typingSpeedMs={40}
        startDelayMs={300}
        waveVariant="subtle"
        loopWave={false}
        style={{ 
          fontFamily: swanky.style.fontFamily,
        }}
      />
      <p
        className="text-sm md:text-base text-charcoal/70 leading-relaxed px-4 max-w-lg mx-auto"
        style={bodyStyle}
      >
        Select what matters most to you in a business
      </p>
    </div>
  );
}
