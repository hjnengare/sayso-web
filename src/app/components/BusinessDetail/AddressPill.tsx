"use client";

import { useState, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';

interface AddressPillProps {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isUserUploaded?: boolean; // If true, use address directly (from user input)
  className?: string;
}

/**
 * AddressPill Component
 * Displays a copy-to-clipboard address pill
 * - For user-uploaded businesses: uses the address field directly
 * - For OSM businesses: reverse-geocodes coordinates to get street address
 * - Non-intrusive, text-based, selectable, on off-white background with charcoal text
 */
export default function AddressPill({
  address,
  latitude,
  longitude,
  isUserUploaded = false,
  className = '',
}: AddressPillProps) {
  const [displayAddress, setDisplayAddress] = useState<string | null>(address || null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // If user-uploaded business, just use the address directly
  // Otherwise, reverse-geocode if coordinates are available
  useEffect(() => {
    if (isUserUploaded) {
      // User-uploaded: use address field directly
      setDisplayAddress(address || null);
      return;
    }

    if (!address && latitude && longitude) {
      // OSM business: reverse-geocode coordinates
      const reverseGeocode = async () => {
        setIsLoading(true);
        try {
          const response = await fetch('/api/geocode/reverse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          });

          const data = await response.json();
          if (data.success && data.address) {
            setDisplayAddress(data.address);
          }
        } catch (error) {
          console.error('[AddressPill] Reverse geocoding failed:', error);
          // Fallback: use coordinates as display
          setDisplayAddress(`${latitude?.toFixed(6)}, ${longitude?.toFixed(6)}`);
        } finally {
          setIsLoading(false);
        }
      };

      reverseGeocode();
    } else if (address) {
      // Address provided, use it directly
      setDisplayAddress(address);
    }
  }, [address, latitude, longitude, isUserUploaded]);

  const handleCopy = async () => {
    if (!displayAddress) return;

    try {
      await navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[AddressPill] Copy failed:', error);
    }
  };

  if (!displayAddress && !isLoading) {
    return null;
  }

  return (
    <button
      onClick={handleCopy}
      disabled={isLoading}
      className={`
        group inline-flex items-center gap-2 px-3 py-1.5
        bg-off-white border border-charcoal/10 rounded-full
        text-charcoal/80 hover:text-charcoal text-sm
        font-normal transition-all duration-200
        hover:border-charcoal/20 hover:bg-off-white/80
        disabled:opacity-60 disabled:cursor-not-allowed
        select-text cursor-pointer
        ${className}
      `}
      title={displayAddress || 'Copy address'}
      aria-label="Copy address"
      style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
    >
      {/* Address Text */}
      <span className="truncate max-w-[300px]">
        {isLoading ? '...' : displayAddress}
      </span>

      {/* Copy Icon */}
      {!isLoading && (
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {copied ? (
            <Check className="w-3.5 h-3.5 text-sage" strokeWidth={3} />
          ) : (
            <Copy className="w-3.5 h-3.5 text-charcoal/40 group-hover:text-charcoal/60" strokeWidth={2} />
          )}
        </span>
      )}
    </button>
  );
}
