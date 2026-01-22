import { AnimatePresence, motion } from "framer-motion";

interface LockedTooltipProps {
  show: boolean;
  label: string;
}

export default function LockedTooltip({ show, label }: LockedTooltipProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 2, scale: 0.98 }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-sage backdrop-blur-sm text-white text-xs font-medium rounded-lg whitespace-nowrap shadow-lg border border-sage/20 z-50"
          style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
        >
          Sign in to {label}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-sage rotate-45 border-l border-t border-sage/20" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
