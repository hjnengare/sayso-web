"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

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
    <motion.div
      className="mx-auto w-full max-w-[2000px] px-2 font-urbanist w-full"
      style={{
        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="text-center w-full">
        <motion.div
          className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center"
          variants={iconVariants}
        >
          <Bookmark className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
        </motion.div>

        <motion.h3
          className="text-h2 font-semibold text-charcoal mb-2"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          }}
          variants={itemVariants}
        >
          No saved items yet
        </motion.h3>

        <motion.p
          className="text-body-sm text-charcoal/60 mb-6 max-w-md mx-auto"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            fontWeight: 500,
          }}
          variants={itemVariants}
        >
          Tap the bookmark icon on any business to save it here
        </motion.p>

        <motion.button
          onClick={() => router.push("/home")}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-sage text-white text-body font-semibold rounded-full hover:bg-sage/90 transition-all duration-300"
          style={{
            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          }}
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Discover Businesses
        </motion.button>
      </div>
    </motion.div>
  );
}
