"use client";

import { m } from "framer-motion";
import { useState, useEffect } from "react";

interface SparkleData {
  id: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
}

export default function FloatingElements() {
  const [sparkles, setSparkles] = useState<SparkleData[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Use fixed positions to avoid hydration mismatch
    const sparkleData: SparkleData[] = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: (i * 83 + 37) % 100, // Fixed pseudo-random positions as percentages
      y: (i * 127 + 19) % 100,
      duration: 3 + (i % 3), // Fixed durations
      delay: i * 0.4, // Fixed delays
    }));
    setSparkles(sparkleData);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Floating orbs */}
      <m.div
        className="absolute w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"
        initial={{ x: -100, y: 100 }}
        animate={{
          x: ["-100px", "100px", "-100px"],
          y: ["100px", "50px", "100px"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ top: "20%", left: "10%" }}
      />

      <m.div
        className="absolute w-24 h-24 bg-gradient-to-br from-coral/8 to-transparent rounded-full blur-xl"
        initial={{ x: 100, y: -50 }}
        animate={{
          x: ["100px", "-50px", "100px"],
          y: ["-50px", "100px", "-50px"],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ top: "60%", right: "15%" }}
      />

      <m.div
        className="absolute w-20 h-20 bg-gradient-to-br from-sage/6 to-transparent rounded-full blur-lg"
        initial={{ x: 0, y: 0 }}
        animate={{
          x: ["0px", "80px", "-40px", "0px"],
          y: ["0px", "-60px", "40px", "0px"],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ bottom: "20%", left: "20%" }}
      />

      {/* Subtle sparkles - only render after hydration */}
      {mounted && sparkles.map((sparkle) => (
        <m.div
          key={sparkle.id}
          className="absolute w-1 h-1 bg-card-bg/20 rounded-full"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
          }}
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: sparkle.duration,
            repeat: Infinity,
            delay: sparkle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
