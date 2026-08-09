import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
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

/** Which tabs carry a badge, and therefore have something to acknowledge. */
export type BadgedTab = "Orders" | "Schedule" | "TransactionHistory";

type SeenCounts = Record<BadgedTab, number>;

const NOTHING_SEEN: SeenCounts = {
  Orders: 0,
  Schedule: 0,
  TransactionHistory: 0,
};

const SEEN_STORAGE_KEY = "spinner.tab-badges.seen";

let counts: OperationsCounts = EMPTY;
let seen: SeenCounts = { ...NOTHING_SEEN };
let inFlight: Promise<OperationsCounts> | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());

  // Driven from the single place every count and acknowledgement change passes through,
  // so the launcher icon cannot drift out of step with the tab badges.
  syncLauncherBadge();
}

/**
 * What each tab currently reports.
 *
 * The dashboard gives a count of outstanding work, which does not go away by being
 * looked at — an unpaid order stays unpaid. A badge that clears on visit has to mean
 * "new since you last looked" instead, so what the owner has already acknowledged is
 * subtracted and only the difference is shown.
 */
function currentFor(tab: BadgedTab) {
  if (tab === "Orders") return counts.newBookings;
  if (tab === "Schedule") return counts.forPickup;
  return counts.unpaidOrders;
}

export function getBadgeCount(tab: BadgedTab) {
  return Math.max(0, currentFor(tab) - seen[tab]);
}

/**
 * The number shown on the app icon in the launcher.
 *
 * The sum of what is waiting across the badged tabs, so a glance at the home screen says
 * whether the shop needs attention without opening anything. Derived from the same
 * figures as the tab badges rather than counted separately, so the icon cannot disagree
 * with what is inside the app.
 */
export function getLauncherBadgeCount() {
  return (
    getBadgeCount("Orders") +
    getBadgeCount("Schedule") +
    getBadgeCount("TransactionHistory")
  );
}

/**
 * Writes the launcher count to the operating system.
 *
 * Failures are ignored on purpose: Android launchers differ in whether they show a count
 * at all, and a missing badge is a cosmetic loss rather than anything worth reporting.
 */
function syncLauncherBadge() {
  void Notifications.setBadgeCountAsync(getLauncherBadgeCount()).catch(
    () => undefined,
  );
}

/**
 * Records that the owner has seen what a tab is showing.
 *
 * Called when the tab is opened. The badge returns on its own as soon as the count rises
 * again, which is the behaviour that makes it worth glancing at.
 */
export function acknowledgeTab(tab: BadgedTab) {
  const current = currentFor(tab);
  if (seen[tab] === current) return;

  seen = { ...seen, [tab]: current };
  emitChange();
  void persistSeen();
}

async function persistSeen() {
  try {
    await SecureStore.setItemAsync(SEEN_STORAGE_KEY, JSON.stringify(seen));
  } catch {
    // Not worth surfacing. Losing this only means a badge reappears after a restart.
  }
}

/** Restores what had been acknowledged before the app was last closed. */
export async function restoreAcknowledgements() {
  try {
    const stored = await SecureStore.getItemAsync(SEEN_STORAGE_KEY);
    if (!stored) return;

    const parsed = JSON.parse(stored) as Partial<SeenCounts>;

    seen = {
      Orders: Number(parsed.Orders) || 0,
      Schedule: Number(parsed.Schedule) || 0,
      TransactionHistory: Number(parsed.TransactionHistory) || 0,
    };

    emitChange();
  } catch {
    seen = { ...NOTHING_SEEN };
  }
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

      // An acknowledgement cannot exceed what is actually outstanding. Without this, a
      // count that falls — an order finally paid, a booking confirmed — would leave the
      // old, higher figure recorded as seen, and the badge would stay hidden through the
      // next few genuinely new arrivals.
      seen = {
        Orders: Math.min(seen.Orders, counts.newBookings),
        Schedule: Math.min(seen.Schedule, counts.forPickup),
        TransactionHistory: Math.min(
          seen.TransactionHistory,
          counts.unpaidOrders,
        ),
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
  seen = { ...NOTHING_SEEN };
  inFlight = null;
  emitChange();
}
