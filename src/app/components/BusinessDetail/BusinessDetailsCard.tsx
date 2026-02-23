// src/components/BusinessDetail/BusinessDetailsCard.tsx
"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle, ChevronDown, ChevronUp, Coins } from "lucide-react";

type DayHours = {
  open: string;
  close: string;
  closed?: boolean;
};

type Hours = string | Record<string, string | DayHours> | { raw?: string; friendly?: string } | null | undefined;

interface BusinessDetailsCardProps {
  priceRange?: string | { raw?: string; friendly?: string };
  verified?: boolean;
  hours?: Hours;
}

// Day names in order
const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayLabels: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

// Convert 24h time to 12h format
const formatTime = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours)) return time;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}${minutes ? `:${minutes.toString().padStart(2, '0')}` : ''} ${period}`;
};

// Get current day name
const getCurrentDay = (): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
};

// Check if business is currently open
const isCurrentlyOpen = (hours: Hours): { isOpen: boolean; status: string } => {
  if (!hours || typeof hours === 'string') {
    return { isOpen: false, status: 'Unknown' };
  }

  const currentDay = getCurrentDay();
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  if (typeof hours === 'object' && !('raw' in hours) && !('friendly' in hours)) {
    const todayHours = (hours as Record<string, string | DayHours>)[currentDay];

    if (!todayHours) {
      return { isOpen: false, status: 'Closed today' };
    }

    // Handle DayHours object format
    if (typeof todayHours === 'object' && 'open' in todayHours) {
      if (todayHours.closed) {
        return { isOpen: false, status: 'Closed today' };
      }
      const [openHour, openMin] = todayHours.open.split(':').map(Number);
      const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
      const openTime = openHour * 60 + (openMin || 0);
      const closeTime = closeHour * 60 + (closeMin || 0);

      if (currentTime >= openTime && currentTime < closeTime) {
        return { isOpen: true, status: `Open until ${formatTime(todayHours.close)}` };
      } else if (currentTime < openTime) {
        return { isOpen: false, status: `Opens at ${formatTime(todayHours.open)}` };
      } else {
        return { isOpen: false, status: 'Closed' };
      }
    }

    // Handle string format "09:00-17:00" or "9-5"
    if (typeof todayHours === 'string') {
      if (todayHours.toLowerCase() === 'closed') {
        return { isOpen: false, status: 'Closed today' };
      }
      const match = todayHours.match(/(\d{1,2}):?(\d{2})?\s*[-–]\s*(\d{1,2}):?(\d{2})?/);
      if (match) {
        const openHour = parseInt(match[1]);
        const openMin = parseInt(match[2] || '0');
        const closeHour = parseInt(match[3]);
        const closeMin = parseInt(match[4] || '0');
        const openTime = openHour * 60 + openMin;
        const closeTime = closeHour * 60 + closeMin;

        if (currentTime >= openTime && currentTime < closeTime) {
          return { isOpen: true, status: `Open until ${formatTime(`${closeHour}:${closeMin.toString().padStart(2, '0')}`)}` };
        } else if (currentTime < openTime) {
          return { isOpen: false, status: `Opens at ${formatTime(`${openHour}:${openMin.toString().padStart(2, '0')}`)}` };
        }
      }
    }
  }

  return { isOpen: false, status: 'Closed' };
};

// Parse hours into structured format for display
const parseHoursForDisplay = (hours: Hours): { day: string; label: string; hours: string; isToday: boolean }[] | null => {
  if (!hours) return null;

  if (typeof hours === 'string') return null;

  if (typeof hours === 'object' && ('raw' in hours || 'friendly' in hours)) {
    return null;
  }

  const currentDay = getCurrentDay();
  const result: { day: string; label: string; hours: string; isToday: boolean }[] = [];

  dayNames.forEach(day => {
    const dayHours = (hours as Record<string, string | DayHours>)[day];
    if (!dayHours) {
      result.push({ day, label: dayLabels[day], hours: 'Closed', isToday: day === currentDay });
      return;
    }

    if (typeof dayHours === 'object' && 'open' in dayHours) {
      if (dayHours.closed) {
        result.push({ day, label: dayLabels[day], hours: 'Closed', isToday: day === currentDay });
      } else {
        result.push({
          day,
          label: dayLabels[day],
          hours: `${formatTime(dayHours.open)} – ${formatTime(dayHours.close)}`,
          isToday: day === currentDay
        });
      }
    } else if (typeof dayHours === 'string') {
      if (dayHours.toLowerCase() === 'closed') {
        result.push({ day, label: dayLabels[day], hours: 'Closed', isToday: day === currentDay });
      } else {
        result.push({ day, label: dayLabels[day], hours: dayHours, isToday: day === currentDay });
      }
    }
  });

  return result.length > 0 ? result : null;
};

// Convert $ to R for price range display
const formatPriceRange = (priceRange: string | { raw?: string; friendly?: string } | undefined): { display: string; description: string } | null => {
  if (!priceRange) return null;

  let priceText = '';
  if (typeof priceRange === 'string') {
    priceText = priceRange.trim();
  } else if (typeof priceRange === 'object') {
    priceText = priceRange.friendly?.trim() || priceRange.raw?.trim() || '';
  }

  if (!priceText) return null;

  // Convert $ symbols to R symbols
  const dollarCount = (priceText.match(/\$/g) || []).length;
  if (dollarCount > 0) {
    const rDisplay = 'R'.repeat(dollarCount);
    const descriptions: Record<number, string> = {
      1: 'Budget friendly',
      2: 'Moderate',
      3: 'Upscale',
      4: 'Luxury',
    };
    return { display: rDisplay, description: descriptions[dollarCount] || '' };
  }

  // If already in R format or other format, return as is
  return { display: priceText, description: '' };
};

export default function BusinessDetailsCard({ priceRange, verified, hours }: BusinessDetailsCardProps) {
  const [showAllHours, setShowAllHours] = useState(false);

  const priceInfo = formatPriceRange(priceRange);
  const hoursData = parseHoursForDisplay(hours);
  const openStatus = isCurrentlyOpen(hours);

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px]  shadow-md p-4 sm:p-6"
    >
      <h2
        className="text-h3 font-semibold text-charcoal mb-4"
        style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
      >
        Business Details
      </h2>

      <div className="space-y-4">
        {/* Price Range */}
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
            <Coins className="w-4 h-4 text-charcoal/85" />
          </span>
          <div className="flex-1">
            <p
              className="text-caption text-charcoal/60"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Price Range
            </p>
            {priceInfo ? (
              <div className="flex items-center gap-2">
                <span
                  className="text-body-sm font-bold text-charcoal"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  {priceInfo.display}
                </span>
                {priceInfo.description && (
                  <span
                    className="text-sm text-charcoal/70"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  >
                    · {priceInfo.description}
                  </span>
                )}
              </div>
            ) : (
              <p
                className="text-body-sm font-semibold text-charcoal/70 italic"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Coming soon
              </p>
            )}
          </div>
        </div>

        {/* Hours */}
        <div className="flex items-start gap-3">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
            <Clock className="w-4 h-4 text-charcoal/85" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p
                className="text-caption text-charcoal/60"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Hours
              </p>
              {hoursData && (
                <button
                  onClick={() => setShowAllHours(!showAllHours)}
                  className="flex items-center gap-1 text-sm text-charcoal/60 hover:text-charcoal transition-colors"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  {showAllHours ? 'Hide' : 'See all'}
                  {showAllHours ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>

            {hoursData ? (
              <div className="mt-1">
                {/* Open/Closed Status */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-semibold ${
                      openStatus.isOpen
                        ? 'bg-card-bg/20 text-navbar-bg'
                        : 'bg-coral/20 text-sage/80'
                    }`}
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${openStatus.isOpen ? 'bg-card-bg' : 'bg-coral'}`} />
                    {openStatus.isOpen ? 'Open' : 'Closed'}
                  </span>
                  <span
                    className="text-sm text-charcoal/60"
                    style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                  >
                    {openStatus.status}
                  </span>
                </div>

                {/* Hours List */}
                <AnimatePresence>
                  {showAllHours && (
                    <m.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-1 overflow-hidden"
                    >
                      {hoursData.map(({ day, label, hours, isToday }) => (
                        <div
                          key={day}
                          className={`flex items-center justify-between py-1 px-2 rounded-lg ${
                            isToday ? 'bg-card-bg/10' : ''
                          }`}
                        >
                          <span
                            className={`text-sm ${isToday ? 'font-semibold text-charcoal' : 'text-charcoal/70'}`}
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                          >
                            {label}
                            {isToday && <span className="ml-1 text-sm text-sage">(Today)</span>}
                          </span>
                          <span
                            className={`text-sm ${
                              hours === 'Closed'
                                ? 'text-charcoal/70'
                                : isToday
                                  ? 'font-semibold text-charcoal'
                                  : 'text-charcoal/70'
                            }`}
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                          >
                            {hours}
                          </span>
                        </div>
                      ))}
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <p
                className="text-body-sm font-semibold text-charcoal/70 italic mt-1"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                Hours coming soon
              </p>
            )}
          </div>
        </div>

        {/* Verification Status */}
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
            <CheckCircle className="w-4 h-4 text-charcoal/85" />
          </span>
          <div>
            <p
              className="text-caption text-charcoal/60"
              style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
              Status
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 text-body-sm font-semibold ${
                  verified ? 'text-sage' : 'text-charcoal/70'
                }`}
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {verified ? (
                  <>
                    <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-off-white/70 hover:bg-off-white/90 transition-colors">
                      <CheckCircle className="w-3 h-3 text-charcoal/85" />
                    </span>
                    Verified
                  </>
                ) : (
                  'Not Verified'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </m.div>
  );
}
