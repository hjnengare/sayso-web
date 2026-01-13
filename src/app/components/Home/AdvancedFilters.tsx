"use client";

import React from 'react';
import { X, DollarSign, Clock, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFilters } from '@/app/contexts/FilterContext';
import { PriceRange } from '@/app/types/filters';

export function AdvancedFilters() {
  const {
    filters,
    setPriceRange,
    setOpenNow,
    setMustMeetDealbreakers,
    toggleAdvanced,
    resetFilters,
  } = useFilters();

  if (!filters.isAdvancedOpen) return null;

  const priceOptions: PriceRange[] = ['$', '$$', '$$$', '$$$$'];

  const togglePrice = (price: PriceRange) => {
    const newPrices = filters.priceRange.includes(price)
      ? filters.priceRange.filter((p) => p !== price)
      : [...filters.priceRange, price];

    // Ensure at least one price is selected
    if (newPrices.length > 0) {
      setPriceRange(newPrices);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-50 flex items-end sm:items-center sm:justify-center"
        onClick={toggleAdvanced}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-charcoal/10">
            <h2
              className="text-xl font-bold text-charcoal"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 700 }}
            >
              More Filters
            </h2>
            <button
              onClick={toggleAdvanced}
              className="p-2 hover:bg-charcoal/5 rounded-full transition-colors"
              aria-label="Close filters"
            >
              <X className="w-5 h-5 text-charcoal" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Price Range */}
            <div>
              <h3
                className="text-base font-semibold text-charcoal mb-3 flex items-center gap-2"
                style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 600 }}
              >
                <DollarSign className="w-5 h-5" />
                Price Range
              </h3>
              <div className="flex gap-2">
                {priceOptions.map((price) => (
                  <button
                    key={price}
                    onClick={() => togglePrice(price)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-2 ${
                      filters.priceRange.includes(price)
                        ? 'bg-sage text-white border-sage'
                        : 'bg-white text-charcoal border-charcoal/20 hover:border-sage'
                    }`}
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 600 }}
                  >
                    {price}
                  </button>
                ))}
              </div>
              <p
                className="text-xs text-charcoal/60 mt-2"
                style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
              >
                Select one or more price ranges
              </p>
            </div>

            {/* Open Now Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-charcoal" />
                <div>
                  <h3
                    className="text-base font-semibold text-charcoal"
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 600 }}
                  >
                    Open Now
                  </h3>
                  <p
                    className="text-xs text-charcoal/60"
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                  >
                    Show only places currently open
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpenNow(!filters.openNow)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  filters.openNow ? 'bg-sage' : 'bg-charcoal/20'
                }`}
                role="switch"
                aria-checked={filters.openNow}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    filters.openNow ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Deal-breakers Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-charcoal" />
                <div>
                  <h3
                    className="text-base font-semibold text-charcoal"
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 600 }}
                  >
                    Must Meet My Standards
                  </h3>
                  <p
                    className="text-xs text-charcoal/60"
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                  >
                    Filter by your deal-breakers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMustMeetDealbreakers(!filters.mustMeetDealbreakers)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  filters.mustMeetDealbreakers ? 'bg-sage' : 'bg-charcoal/20'
                }`}
                role="switch"
                aria-checked={filters.mustMeetDealbreakers}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    filters.mustMeetDealbreakers ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-charcoal/10 flex gap-3">
            <button
              onClick={resetFilters}
              className="flex-1 py-3 rounded-full text-sm font-semibold text-charcoal border-2 border-charcoal/20 hover:border-charcoal hover:bg-charcoal/5 transition-all duration-200"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 600 }}
            >
              Reset All
            </button>
            <button
              onClick={toggleAdvanced}
              className="flex-1 py-3 rounded-full text-sm font-semibold text-white bg-sage hover:bg-sage/90 transition-all duration-200"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 600 }}
            >
              Apply Filters
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
