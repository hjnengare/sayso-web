"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { m } from "framer-motion";

export default function EmptySavedState() {
  const router = useRouter();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  const iconVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
      },
    },
  };

  return (
    <m.div
      className="mx-auto w-full max-w-[2000px] px-2 font-urbanist w-full"
      style={{
        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="text-center w-full">
        <m.div
          className="w-12 h-12 mx-auto mb-6 bg-off-white/70 rounded-full flex items-center justify-center text-charcoal/85 transition duration-200 ease-out hover:bg-off-white/90 hover:scale-[1.03]"
          variants={iconVariants}
        >
          <Bookmark className="w-6 h-6" strokeWidth={1.5} aria-hidden />
        </m.div>

        <m.h3
          className="text-h2 font-semibold text-charcoal mb-2"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          }}
          variants={itemVariants}
        >
          No saved items yet
        </m.h3>

        <m.p
          className="text-body-sm text-charcoal/60 mb-6 max-w-md mx-auto"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            fontWeight: 500,
          }}
          variants={itemVariants}
        >
          Tap the bookmark icon on any business to save it here
        </m.p>

        <m.button
          onClick={() => router.push("/home")}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-card-bg text-white text-body font-semibold rounded-full hover:bg-card-bg/90 transition-all duration-300"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          }}
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Discover Businesses
        </m.button>
      </div>
    </m.div>
  );
}
