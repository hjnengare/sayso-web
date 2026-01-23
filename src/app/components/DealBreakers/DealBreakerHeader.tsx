"use client";

import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";

export default function DealBreakerHeader() {
  const bodyStyle = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: 400,
  } as React.CSSProperties;

  return (
    <div className="text-center mb-6 pt-4 sm:pt-6 enter-fade title-no-break">
      <WavyTypedTitle
        text="What are your dealbreakers?"
        as="h2"
        className="font-urbanist text-2xl md:text-3xl lg:text-4xl font-700 mb-2 tracking-tight px-6 sm:px-4 md:px-2 text-charcoal"
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
      <p
        className="text-sm md:text-base text-charcoal/70 leading-relaxed px-4 max-w-lg mx-auto break-words whitespace-normal"
        style={bodyStyle}
      >
        Select what matters most to you in a business
      </p>
    </div>
  );
}
