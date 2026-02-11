"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { calculateDistanceKm } from "../lib/utils/searchHelpers";

type LocationStatus = "idle" | "loading" | "granted" | "denied" | "unavailable";

interface LocationCoordinates {
  lat: number;
  lng: number;
}

interface LocationStoreState {
  initialized: boolean;
  status: LocationStatus;
  coords: LocationCoordinates | null;
  lastError: string | null;
  snoozedUntil: number | null;
  deniedDismissed: boolean;
}

const SNOOZE_STORAGE_KEY = "sayso.location.prompt.snooze_until";
const DENIED_ACK_STORAGE_KEY = "sayso.location.prompt.denied_ack";
const SNOOZE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const listeners = new Set<(nextState: LocationStoreState) => void>();

let state: LocationStoreState = {
  initialized: false,
  status: "idle",
  coords: null,
  lastError: null,
  snoozedUntil: null,
  deniedDismissed: false,
};

let initializedClientState = false;
let geolocationRequestInFlight = false;
let promptShownThisSession = false;

function emitState() {
  listeners.forEach((listener) => listener(state));
}

function updateState(patch: Partial<LocationStoreState>) {
  state = { ...state, ...patch };
  emitState();
}

function subscribe(listener: (nextState: LocationStoreState) => void) {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

function readNumberFromStorage(key: string): number | null {
  if (typeof window === "undefined") return null;
  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) return null;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function readBooleanFromStorage(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "1";
}

function writeNumberToStorage(key: string, value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(value));
}

function writeBooleanToStorage(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value ? "1" : "0");
}

function isPermissionDenied(error: GeolocationPositionError): boolean {
  return error.code === error.PERMISSION_DENIED;
}

function requestCurrentLocation() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    updateState({
      status: "unavailable",
      lastError: "Geolocation is not supported in this browser.",
    });
    return;
  }

  if (geolocationRequestInFlight) return;

  geolocationRequestInFlight = true;
  updateState({ status: "loading", lastError: null });

  navigator.geolocation.getCurrentPosition(
    (position) => {
      geolocationRequestInFlight = false;
      updateState({
        status: "granted",
        coords: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        lastError: null,
      });
    },
    (error) => {
      geolocationRequestInFlight = false;
      if (isPermissionDenied(error)) {
        updateState({
          status: "denied",
          coords: null,
          lastError: error.message || "Location permission denied.",
        });
        return;
      }

      updateState({
        status: "unavailable",
        lastError: error.message || "Unable to retrieve location.",
      });
    },
    {
      enableHighAccuracy: false,
      maximumAge: 600_000,
      timeout: 9_000,
    }
  );
}

async function initializeClientState() {
  if (initializedClientState || typeof window === "undefined") return;
  initializedClientState = true;

  const snoozedUntilRaw = readNumberFromStorage(SNOOZE_STORAGE_KEY);
  const now = Date.now();
  const snoozedUntil = snoozedUntilRaw && snoozedUntilRaw > now ? snoozedUntilRaw : null;
  const deniedDismissed = readBooleanFromStorage(DENIED_ACK_STORAGE_KEY);

  updateState({
    initialized: true,
    snoozedUntil,
    deniedDismissed,
    lastError: null,
  });

  if (!navigator.geolocation) {
    updateState({
      status: "unavailable",
      lastError: "Geolocation is not supported in this browser.",
    });
    return;
  }

  if (navigator.permissions && typeof navigator.permissions.query === "function") {
    try {
      const permissionStatus = await navigator.permissions.query({
        name: "geolocation" as PermissionName,
      });

      if (permissionStatus.state === "denied") {
        updateState({ status: "denied", coords: null });
      } else if (permissionStatus.state === "granted") {
        requestCurrentLocation();
      } else {
        updateState({ status: "idle" });
      }

      permissionStatus.onchange = () => {
        if (permissionStatus.state === "granted") {
          requestCurrentLocation();
        } else if (permissionStatus.state === "denied") {
          updateState({ status: "denied", coords: null });
        } else if (!geolocationRequestInFlight) {
          updateState({ status: "idle" });
        }
      };
      return;
    } catch (error) {
      console.warn("[LOCATION] Permissions API query failed:", error);
    }
  }

  updateState({ status: "idle" });
}

export function isValidCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatDistanceAway(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return "";
  if (distanceKm < 1) {
    const roundedMeters = Math.max(10, Math.round((distanceKm * 1000) / 10) * 10);
    return `${roundedMeters} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

export function claimLocationPromptSessionSlot(): boolean {
  if (promptShownThisSession) return false;
  promptShownThisSession = true;
  return true;
}

export interface UseBusinessDistanceLocationOptions {
  hasCoordinateBusinesses?: boolean;
}

export function useBusinessDistanceLocation(
  options: UseBusinessDistanceLocationOptions = {}
) {
  const [storeState, setStoreState] = useState<LocationStoreState>(state);

  useEffect(() => subscribe(setStoreState), []);
  useEffect(() => {
    void initializeClientState();
  }, []);

  const requestLocation = useCallback(() => {
    requestCurrentLocation();
  }, []);

  const dismissPromptForSevenDays = useCallback(() => {
    const snoozedUntil = Date.now() + SNOOZE_DURATION_MS;
    writeNumberToStorage(SNOOZE_STORAGE_KEY, snoozedUntil);
    updateState({ snoozedUntil });
  }, []);

  const acknowledgeDeniedPrompt = useCallback(() => {
    writeBooleanToStorage(DENIED_ACK_STORAGE_KEY, true);
    updateState({ deniedDismissed: true });
  }, []);

  const isPromptSnoozed = Boolean(
    storeState.snoozedUntil && storeState.snoozedUntil > Date.now()
  );

  const hasCoordinateBusinesses = options.hasCoordinateBusinesses === true;

  const promptVariant = useMemo<"request" | "denied" | null>(() => {
    if (!hasCoordinateBusinesses) return null;

    if (storeState.status === "denied" && !storeState.deniedDismissed) {
      return "denied";
    }

    if (
      storeState.status === "unavailable" &&
      typeof storeState.lastError === "string" &&
      storeState.lastError.toLowerCase().includes("not supported")
    ) {
      return null;
    }

    if (
      !isPromptSnoozed &&
      (storeState.status === "idle" || storeState.status === "unavailable")
    ) {
      return "request";
    }

    return null;
  }, [
    hasCoordinateBusinesses,
    isPromptSnoozed,
    storeState.deniedDismissed,
    storeState.lastError,
    storeState.status,
  ]);

  const getDistanceKm = useCallback(
    (businessLat: number, businessLng: number): number | null => {
      if (storeState.status !== "granted" || !storeState.coords) return null;
      if (!isValidCoordinate(businessLat) || !isValidCoordinate(businessLng)) return null;
      return calculateDistanceKm(
        storeState.coords.lat,
        storeState.coords.lng,
        businessLat,
        businessLng
      );
    },
    [storeState.coords, storeState.status]
  );

  return {
    ...storeState,
    promptVariant,
    shouldShowPrompt: promptVariant !== null,
    isPromptSnoozed,
    requestLocation,
    dismissPromptForSevenDays,
    acknowledgeDeniedPrompt,
    getDistanceKm,
  };
}
