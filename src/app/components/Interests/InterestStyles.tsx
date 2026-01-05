"use client";

const entranceStyles = `
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .enter-fade {
    opacity: 0;
    animation: fadeSlideIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  }
  .enter-stagger { 
    opacity: 0; 
    animation: fadeSlideIn 0.25s ease-out forwards;
    will-change: opacity, transform;
    transform: translateZ(0);
  }

  @keyframes bubbly {
    0% { transform: translateZ(0) scale(1); }
    40% { transform: translateZ(0) scale(1.05); }
    100% { transform: translateZ(0) scale(1); }
  }
  .animate-bubbly { 
    animation: bubbly 0.35s ease-out;
    will-change: transform;
    transform: translateZ(0);
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-4px); }
    40% { transform: translateX(4px); }
    60% { transform: translateX(-3px); }
    80% { transform: translateX(2px); }
  }
  .animate-shake { animation: shake 0.35s ease-in-out; }

  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
    .floating-orb { animation: none !important; opacity: 0.2 !important; }
  }

  /* Premium floating orbs */
  @keyframes float1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -30px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
  }

  @keyframes float2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(-40px, 40px) scale(0.95); }
    66% { transform: translate(25px, -25px) scale(1.05); }
  }

  @keyframes float3 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(35px, 35px) scale(1.08); }
  }

  @keyframes float4 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-30px, -30px) scale(0.92); }
  }

  @keyframes float5 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(20px, -40px) scale(1.06); }
    75% { transform: translate(-25px, 30px) scale(0.94); }
  }

  .floating-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    pointer-events: none;
    z-index: 0;
    opacity: 0.4;
    will-change: transform;
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  .floating-orb-1 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(157, 171, 155, 0.6) 0%, rgba(157, 171, 155, 0.2) 50%, transparent 100%);
    top: 10%;
    left: 5%;
    animation: float1 20s ease-in-out infinite;
  }

  .floating-orb-2 {
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, rgba(125, 15, 42, 0.5) 0%, rgba(125, 15, 42, 0.2) 50%, transparent 100%);
    top: 60%;
    right: 8%;
    animation: float2 25s ease-in-out infinite;
  }

  .floating-orb-3 {
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(157, 171, 155, 0.45) 0%, rgba(157, 171, 155, 0.15) 50%, transparent 100%);
    bottom: 15%;
    left: 10%;
    animation: float3 18s ease-in-out infinite;
  }

  .floating-orb-4 {
    width: 180px;
    height: 180px;
    background: radial-gradient(circle, rgba(125, 15, 42, 0.4) 0%, rgba(125, 15, 42, 0.15) 50%, transparent 100%);
    top: 30%;
    right: 15%;
    animation: float4 22s ease-in-out infinite;
  }

  .floating-orb-5 {
    width: 220px;
    height: 220px;
    background: radial-gradient(circle, rgba(157, 171, 155, 0.5) 0%, rgba(157, 171, 155, 0.2) 50%, transparent 100%);
    bottom: 25%;
    right: 5%;
    animation: float5 24s ease-in-out infinite;
  }

  .floating-orb-6 {
    width: 160px;
    height: 160px;
    background: radial-gradient(circle, rgba(125, 15, 42, 0.35) 0%, rgba(125, 15, 42, 0.12) 50%, transparent 100%);
    top: 50%;
    left: 2%;
    animation: float1 19s ease-in-out infinite reverse;
  }

  /* Prevent word breaking in titles on mobile */
  .title-no-break {
    word-break: keep-all;
    overflow-wrap: normal;
    white-space: normal;
  }

  @media (max-width: 768px) {
    /* Reduce blur significantly on mobile for better performance */
    .floating-orb {
      filter: blur(20px);
      opacity: 0.25;
    }
    /* Hide some orbs on mobile to reduce rendering cost */
    .floating-orb-4,
    .floating-orb-5,
    .floating-orb-6 {
      display: none;
    }
    .floating-orb-1 { width: 150px; height: 150px; }
    .floating-orb-2 { width: 120px; height: 120px; }
    .floating-orb-3 { width: 100px; height: 100px; }
    
    .title-no-break {
      word-break: keep-all;
      overflow-wrap: normal;
      white-space: nowrap;
      max-width: 100%;
    }
    
    /* Prevent breaking within words - ensure the title doesn't break */
    .title-no-break h2 {
      white-space: nowrap;
      word-break: keep-all;
      overflow-wrap: normal;
    }
  }
`;

export default function InterestStyles() {
  return <style dangerouslySetInnerHTML={{ __html: entranceStyles }} />;
}
