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
  /** How many rows the transaction history holds. See currentFor. */
  transactionCount: number;
}

const EMPTY: OperationsCounts = {
  beingProcessed: 0,
  completedToday: 0,
  forPickup: 0,
  newBookings: 0,
  readyForDelivery: 0,
  salesToday: 0,
  transactionCount: 0,
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
let restoring: Promise<void> | null = null;
let hasStoredAcknowledgements = false;
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
 *
 * Transaction History reports the size of the transaction list rather than unpaid
 * orders. It used to report unpaid orders, which meant taking a booking raised a badge
 * on a page that lists money movements and so had nothing new on it: an unpaid booking
 * is not a transaction. Counting the list itself means the badge appears when a payment
 * actually lands — an online QR payment, or an order the owner marks paid — and stays
 * away for a booking that is merely received.
 */
function currentFor(tab: BadgedTab) {
  if (tab === "Orders") return counts.newBookings;
  if (tab === "Schedule") return counts.forPickup;
  return counts.transactionCount;
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
    hasStoredAcknowledgements = true;
  } catch {
    // Not worth surfacing. Losing this only means a badge reappears after a restart.
  }
}

/** Restores what had been acknowledged before the app was last closed. */
export async function restoreAcknowledgements() {
  return ensureAcknowledgementsRestored();
}

/**
 * Reads the stored acknowledgements once.
 *
 * Shared as a promise because more than one caller refreshes the counts — the tab bar on
 * focus and the home screen's dashboard load — and a refresh that ran before the stored
 * values were back would treat everything as unseen, then be overwritten a moment later.
 */
function ensureAcknowledgementsRestored() {
  restoring ??= readStoredAcknowledgements();
  return restoring;
}

async function readStoredAcknowledgements() {
  try {
    const stored = await SecureStore.getItemAsync(SEEN_STORAGE_KEY);
    if (!stored) return;

    const parsed = JSON.parse(stored) as Partial<SeenCounts>;

    seen = {
      Orders: Number(parsed.Orders) || 0,
      Schedule: Number(parsed.Schedule) || 0,
      TransactionHistory: Number(parsed.TransactionHistory) || 0,
    };

    hasStoredAcknowledgements = true;
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

  inFlight = loadCounts().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

async function loadCounts() {
  // Before the counts are applied, so an acknowledgement that is still being read back
  // from storage is not mistaken for "nothing seen yet".
  await ensureAcknowledgementsRestored();

  const response = await apiRequest<OperationsCounts>(
    "/api/operations/dashboard",
  );

  counts = {
    beingProcessed: response.beingProcessed ?? 0,
    completedToday: response.completedToday ?? 0,
    forPickup: response.forPickup ?? 0,
    newBookings: response.newBookings ?? 0,
    readyForDelivery: response.readyForDelivery ?? 0,
    salesToday: response.salesToday ?? 0,
    transactionCount: response.transactionCount ?? 0,
    unpaidOrders: response.unpaidOrders ?? 0,
  };

  // The transaction count is a running total of everything the shop has ever taken, so
  // on a first run there is nothing to compare it against and the whole history would
  // arrive as a badge of forty-something. Treat what is already there as seen; only what
  // arrives afterwards is new. The other two tabs count outstanding work, where the
  // figure is meaningful on its own and worth showing immediately.
  if (!hasStoredAcknowledgements) {
    seen = { ...seen, TransactionHistory: counts.transactionCount };
    hasStoredAcknowledgements = true;
    void persistSeen();
  }

  // An acknowledgement cannot exceed what is actually outstanding. Without this, a
  // count that falls — an order finally paid, a booking confirmed — would leave the
  // old, higher figure recorded as seen, and the badge would stay hidden through the
  // next few genuinely new arrivals.
  seen = {
    Orders: Math.min(seen.Orders, counts.newBookings),
    Schedule: Math.min(seen.Schedule, counts.forPickup),
    TransactionHistory: Math.min(
      seen.TransactionHistory,
      counts.transactionCount,
    ),
  };

  emitChange();
  return counts;
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

  // Cleared so the next session reads the stored acknowledgements again. Leaving the
  // resolved promise in place would skip that read, and the transaction badge would then
  // find nothing acknowledged and show the shop's entire history as new.
  restoring = null;
  hasStoredAcknowledgements = false;

  emitChange();
}
