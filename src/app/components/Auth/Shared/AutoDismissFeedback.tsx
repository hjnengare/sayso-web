"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, m } from "framer-motion";

const DISMISS_MS = { success: 1500, error: 3000 } as const;

interface AutoDismissFeedbackProps {
  /** Controls dismiss duration: success=1.5s, error=3s */
  type: "success" | "error";
  /** The feedback message text — null/empty hides immediately */
  message: string | null | undefined;
  /** Increment to force-dismiss (e.g. on input focus) */
  resetKey?: number;
  children: ReactNode;
}

export function AutoDismissFeedback({
  type,
  message,
  resetKey = 0,
  children,
}: AutoDismissFeedbackProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dismissedRef = useRef<string | null>(null);

  // Handle message lifecycle: show → auto-dismiss after duration
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (message && message !== dismissedRef.current) {
      setVisible(true);
      dismissedRef.current = null;
      timerRef.current = setTimeout(() => {
        setVisible(false);
        dismissedRef.current = message;
      }, DISMISS_MS[type]);
    } else if (!message) {
      setVisible(false);
      dismissedRef.current = null;
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message, type]);

  // Force-dismiss on focus (resetKey increment)
  useEffect(() => {
    if (resetKey > 0) {
      setVisible(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (message) dismissedRef.current = message;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return (
    <AnimatePresence>
      {visible && message ? (
        <m.div
          key={message}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
