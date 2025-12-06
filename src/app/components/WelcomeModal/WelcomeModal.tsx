"use client";

import { useEffect, useState } from "react";
import { X, MapPin, Star, MessageCircle, Heart } from "react-feather";
import { motion, AnimatePresence } from "framer-motion";

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen the welcome modal before
    const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");

    if (!hasSeenWelcome) {
      // Show modal after a short delay for better UX
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("hasSeenWelcome", "true");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-[9998]"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{
                duration: 0.4,
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
              className=" bg-off-white   rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto relative border border-charcoal/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-charcoal/40 hover:text-charcoal transition-colors duration-200 p-2 hover:bg-charcoal/5 rounded-full z-10"
                aria-label="Close welcome modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header with gradient */}
              <div className="bg-gradient-to-br from-sage/10 via-coral/5 to-sage/10 p-6 sm:p-8 pb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-sage to-coral rounded-lg flex items-center justify-center shadow-lg">
                    <MapPin className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h2 className="font-urbanist text-lg sm:text-lg font-700 text-charcoal text-center mb-2">
                  Welcome to sayso
                </h2>
                <p className="font-urbanist text-sm sm:text-base font-600 text-charcoal/70 text-center">
                  Discover places real locals love
                </p>
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8 pt-6 space-y-6">
                <div>
                  <h3 className="font-urbanist text-lg font-600 text-charcoal mb-4">
                    What is sayso?
                  </h3>
                  <p className="font-urbanist text-sm text-charcoal/70 leading-relaxed">
                    sayso is a community-driven platform where locals share their favorite spots—from hidden cafes to trending restaurants. No ads, no sponsored content—just authentic recommendations from real people.
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-4">
                  <h3 className="font-urbanist text-lg font-600 text-charcoal">
                    How you can contribute:
                  </h3>

                  <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 bg-sage/10 rounded-[12px] flex items-center justify-center flex-shrink-0">
                      <Star className="w-5 h-5 text-sage" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-urbanist text-sm font-600 text-charcoal mb-1">
                        Leave Reviews
                      </h4>
                      <p className="font-urbanist text-sm sm:text-xs text-charcoal/60 leading-relaxed">
                        Share your experiences and help others discover great places
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 bg-coral/10 rounded-[12px] flex items-center justify-center flex-shrink-0">
                      <Heart className="w-5 h-5 text-coral" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-urbanist text-sm font-600 text-charcoal mb-1">
                        Save Favorites
                      </h4>
                      <p className="font-urbanist text-sm sm:text-xs text-charcoal/60 leading-relaxed">
                        Create lists of your favorite spots to revisit anytime
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 bg-charcoal/10 rounded-[12px] flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-charcoal" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-urbanist text-sm font-600 text-charcoal mb-1">
                        Join the Community
                      </h4>
                      <p className="font-urbanist text-sm sm:text-xs text-charcoal/60 leading-relaxed">
                        Connect with fellow locals and share recommendations
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  onClick={handleClose}
                  className="w-full bg-gradient-to-r from-sage to-sage/90 hover:from-coral hover:to-coral/90 text-white font-urbanist text-base font-600 py-3.5 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-sage/20"
                >
                  Start Exploring
                </button>

                <p className="text-center font-urbanist text-sm sm:text-xs text-charcoal/50">
                  You can always find this info in Settings
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
