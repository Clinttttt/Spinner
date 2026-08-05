import { useSyncExternalStore } from "react";

import { apiRequest } from "../../api/apiClient";

/**
 * The counts the owner needs to see at a glance.
 *
 * Mirrors GET /api/operations/dashboard, which already returns all of these. The home
 * screen previously read only newBookings from it.
 */
export interface OperationsCounts {
  newBookings: number;
  forPickup: number;
  beingProcessed: number;
  readyForDelivery: number;
  unpaidOrders: number;
  completedToday: number;
  salesToday: number;
}

const EMPTY: OperationsCounts = {
  beingProcessed: 0,
  completedToday: 0,
  forPickup: 0,
  newBookings: 0,
  readyForDelivery: 0,
  salesToday: 0,
  unpaidOrders: 0,
};

let counts: OperationsCounts = EMPTY;
let inFlight: Promise<OperationsCounts> | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function subscribeToOperationsCounts(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOperationsCountsSnapshot() {
  return counts;
}

/**
 * The current counts, kept in one place.
 *
 * Shared so the tab bar and the home screen do not each ask for the same figures.
 * The tab bar is mounted for the whole session, so a second fetch per screen would be
 * a request on every navigation.
 */
export function useOperationsCounts() {
  return useSyncExternalStore(
    subscribeToOperationsCounts,
    getOperationsCountsSnapshot,
    getOperationsCountsSnapshot,
  );
}

export async function refreshOperationsCounts() {
  // Callers overlap — the tab bar and home screen both refresh on focus — so a fetch
  // already running is shared rather than duplicated.
  if (inFlight) return inFlight;

  inFlight = apiRequest<OperationsCounts>("/api/operations/dashboard")
    .then((response) => {
      counts = {
        beingProcessed: response.beingProcessed ?? 0,
        completedToday: response.completedToday ?? 0,
        forPickup: response.forPickup ?? 0,
        newBookings: response.newBookings ?? 0,
        readyForDelivery: response.readyForDelivery ?? 0,
        salesToday: response.salesToday ?? 0,
        unpaidOrders: response.unpaidOrders ?? 0,
      };
      emitChange();
      return counts;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * Re-reads the counts after something changed an order.
 *
 * Called from the services that move an order along, so a badge does not keep claiming
 * three bookings are waiting after the owner has just confirmed all three. Failures are
 * ignored: the periodic refresh will catch up, and an action that succeeded should not
 * report an error because a count could not be refreshed.
 */
export function invalidateOperationsCounts() {
  void refreshOperationsCounts().catch(() => undefined);
}

export function resetOperationsCounts() {
  counts = EMPTY;
  inFlight = null;
  emitChange();
}
