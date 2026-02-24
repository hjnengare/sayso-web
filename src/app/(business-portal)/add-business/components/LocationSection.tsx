"use client";

import React from "react";
import { m, AnimatePresence } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { BusinessFormData } from "./types";
import MapPicker, { MapPickerLocation } from "./MapPicker";

type GeocodeStatus = "idle" | "searching" | "found" | "not_found" | "error";

interface LocationSectionProps {
  formData: BusinessFormData;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  geocodeStatus: GeocodeStatus;
  onInputChange: (field: string, value: string | boolean) => void;
  onBlur: (field: string) => void;
  onLocationBlur: () => void;
  onClearCoordinates: () => void;
  onLocationSelect?: (loc: MapPickerLocation) => void;
}

const ICON_CHIP_CLASS =
  "grid h-10 w-10 place-items-center rounded-full bg-off-white/70 text-charcoal/85 transition-colors duration-200 hover:bg-off-white/90";

const LocationSection: React.FC<LocationSectionProps> = ({
  formData,
  errors,
  touched,
  geocodeStatus,
  onInputChange,
  onBlur,
  onLocationBlur,
  onClearCoordinates,
  onLocationSelect,
}) => {
  const isOnlineOnly = formData.businessType === "online-only";
  const showLocationError = Boolean(touched.location && errors.location);
  const hasCoordinates = Boolean(formData.lat && formData.lng);

  const locationLabel =
    formData.businessType === "service-area"
      ? "Service Area (City/Area)"
      : isOnlineOnly
      ? "Location (Optional)"
      : "Location (City/Area)";

  return (
    <div className="relative bg-white rounded-[12px] overflow-hidden border border-charcoal/10 shadow-md px-4 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12 animate-fade-in-up animate-delay-200">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg pointer-events-none" />

      <div className="relative z-10">
        <h3
          className="font-urbanist text-base font-semibold text-charcoal mb-6 flex items-center gap-3"
          style={{
            fontFamily:
              "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            fontWeight: 600,
          }}
        >
          <span className={ICON_CHIP_CLASS}>
            <MapPin className="w-5 h-5" />
          </span>
          Location Information
        </h3>

        <div className="space-y-6">
          {/* Location */}
          <div>
            <label
              className="block text-sm font-semibold text-charcoal mb-2"
              style={{
                fontFamily:
                  "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                fontWeight: 600,
              }}
            >
              {locationLabel}
              {!isOnlineOnly && <span className="text-coral">*</span>}
            </label>

            <input
              type="text"
              name="location"
              id="location"
              value={formData.location}
              onChange={(e) => onInputChange("location", e.target.value)}
              onBlur={() => {
                onBlur("location");
                onLocationBlur();
              }}
              aria-invalid={showLocationError ? "true" : "false"}
              aria-describedby={showLocationError ? "location-error" : undefined}
              aria-required={!isOnlineOnly}
              style={{
                fontFamily:
                  "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                fontWeight: 600,
              }}
              className={`w-full bg-white/95 backdrop-blur-sm border pl-4 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full ${
                errors.location
                  ? "border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20"
                  : "border-charcoal/15 focus:ring-navbar-bg/30 focus:border-navbar-bg"
              }`}
              placeholder={
                isOnlineOnly
                  ? "e.g., Cape Town, South Africa (optional)"
                  : "e.g., Cape Town, V&A Waterfront"
              }
            />

            {showLocationError && (
              <p
                id="location-error"
                className="mt-2 text-sm text-navbar-bg font-medium flex items-center gap-1.5"
                role="alert"
                aria-live="polite"
                style={{
                  fontFamily:
                    "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                }}
              >
                {errors.location}
              </p>
            )}

            {!showLocationError && geocodeStatus === "searching" && (
              <p
                className="mt-2 text-xs text-charcoal/70 font-medium"
                style={{
                  fontFamily:
                    "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                }}
              >
                Finding location...
              </p>
            )}

            {!showLocationError && geocodeStatus === "found" && hasCoordinates && (
              <p
                className="mt-2 text-xs text-sage font-medium"
                style={{
                  fontFamily:
                    "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                }}
              >
                Location found ✓
              </p>
            )}

            {!showLocationError &&
              (geocodeStatus === "not_found" || geocodeStatus === "error") && (
                <p
                  className="mt-2 text-xs text-charcoal/70 font-medium"
                  style={{
                    fontFamily:
                      "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                >
                  We couldn&apos;t pinpoint this address yet. You can still continue without coordinates.
                </p>
              )}

            {isOnlineOnly &&
              !showLocationError &&
              geocodeStatus !== "searching" &&
              geocodeStatus !== "found" &&
              geocodeStatus !== "not_found" &&
              geocodeStatus !== "error" && (
              <p
                className="mt-2 text-xs text-charcoal/70 font-medium"
                style={{
                  fontFamily:
                    "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                }}
              >
                This business operates online only. Location is optional.
              </p>
              )}
          </div>

          {/* Map Picker (physical & service-area only) */}
          {!isOnlineOnly && onLocationSelect && (
            <div>
              <label
                className="block text-sm font-semibold text-charcoal mb-2"
                style={{
                  fontFamily:
                    "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  fontWeight: 600,
                }}
              >
                Set location on map
              </label>
              <MapPicker
                lat={formData.lat}
                lng={formData.lng}
                onLocationSelect={(loc) => {
                  onLocationSelect(loc);
                  onBlur("location");
                }}
                className="mt-2"
              />
            </div>
          )}

          {/* Selected Coordinates */}
          <AnimatePresence>
            {(formData.lat || formData.lng) && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-card-bg/10 rounded-[16px] border border-sage/20 overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="text-xs text-charcoal/70 mb-1"
                      style={{ fontFamily: "Urbanist, sans-serif" }}
                    >
                      Selected Coordinates:
                    </p>

                    <p
                      className="text-sm font-semibold text-charcoal break-words"
                      style={{ fontFamily: "Urbanist, sans-serif" }}
                    >
                      {formData.lat && formData.lng
                        ? `${parseFloat(formData.lat).toFixed(6)}, ${parseFloat(
                            formData.lng
                          ).toFixed(6)}`
                        : formData.lat
                        ? `Lat: ${formData.lat}`
                        : `Lng: ${formData.lng}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClearCoordinates}
                    className="shrink-0 grid h-9 w-9 place-items-center rounded-full bg-off-white/70 text-charcoal/85 hover:bg-off-white/90 transition-colors border-none"
                    aria-label="Clear coordinates"
                    title="Clear coordinates"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LocationSection;
