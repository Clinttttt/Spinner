import { useSyncExternalStore } from "react";

import { getBusinessSettings } from "./settingsService";

/**
 * The shop's own name and logo.
 *
 * The header used to have "ENGR. SPIN", "LAUNDROMAT" and the logo file written into it, so
 * the app was one particular laundromat's app. The API has carried a business name and a
 * logo URL from the start and nothing read them. This does, so changing the name or the logo
 * in Settings changes what the app shows.
 *
 * Held in one place because the header appears on nearly every screen: fetching per header
 * would be a request per navigation, and each header could disagree with the next while they
 * loaded.
 *
 * Reading business settings is allowed without an account, which is what lets a staff account
 * see the shop's name even though changing it is owner work.
 */
export interface BusinessIdentity {
  /** Empty until it has been read, so callers can fall back rather than flash a guess. */
  businessName: string;
  logoUrl: string | null;
}

const EMPTY: BusinessIdentity = { businessName: "", logoUrl: null };

let identity: BusinessIdentity = EMPTY;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return identity;
}

export function useBusinessIdentity() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Reads the shop's identity.
 *
 * Shared while in flight, because several headers can mount at once on a first render.
 * Failures are ignored on purpose: the header falls back to the bundled mark, which is a
 * better outcome than an empty bar or an error over a name.
 */
export function refreshBusinessIdentity() {
  inFlight ??= getBusinessSettings()
    .then((settings) => {
      identity = {
        businessName: settings.businessName?.trim() ?? "",
        logoUrl: settings.logoUrl?.trim() ? settings.logoUrl.trim() : null,
      };
      emitChange();
    })
    .catch(() => undefined)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Cleared on sign-out, so the next account does not briefly see the last shop's name. */
export function resetBusinessIdentity() {
  identity = EMPTY;
  inFlight = null;
  emitChange();
}
