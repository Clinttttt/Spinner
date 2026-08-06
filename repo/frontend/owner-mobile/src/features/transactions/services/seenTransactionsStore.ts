import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "spinner.transactions.seen";

/**
 * How many opened transactions to remember.
 *
 * Enough that anything still on screen is covered several times over, and bounded so the
 * record cannot grow without limit as the shop trades for years.
 */
const REMEMBER_LIMIT = 400;

/**
 * Which transactions the owner has already opened.
 *
 * Kept on the phone rather than the server: this is about what this person has looked at,
 * not a property of the transaction, and two staff sharing a counter phone caring about
 * the same thing is the expected case rather than a problem.
 */
let seen = new Set<string>();
let restored = false;
const listeners = new Set<() => void>();

/**
 * A value that changes whenever the set does.
 *
 * useSyncExternalStore compares snapshots by identity, and a Set mutated in place is the
 * same object every time, so nothing would re-render. A counter is the cheap way to give
 * it something honest to compare.
 */
let version = 0;

function emitChange() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getVersion() {
  return version;
}

/** Subscribes a screen to changes, so rows settle as they are opened. */
export function useSeenTransactions() {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return seen;
}

export function hasSeenTransaction(id: string) {
  return seen.has(id);
}

export function markTransactionSeen(id: string) {
  if (seen.has(id)) return;

  seen.add(id);
  emitChange();
  void persist();
}

/**
 * Treats everything currently listed as seen.
 *
 * Used the first time the list is loaded on a fresh install. Without it every historic
 * transaction would be marked unread at once, which says nothing useful and makes the
 * whole screen look unattended.
 */
export function markAllTransactionsSeen(ids: string[]) {
  let changed = false;

  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      changed = true;
    }
  }

  if (!changed) return;

  emitChange();
  void persist();
}

export function hasRestoredSeenTransactions() {
  return restored;
}

export async function restoreSeenTransactions() {
  if (restored) return;

  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed))
        seen = new Set(parsed.filter((id) => typeof id === "string"));
    }
  } catch {
    seen = new Set();
  } finally {
    restored = true;
    emitChange();
  }
}

export function resetSeenTransactions() {
  seen = new Set();
  restored = false;
  emitChange();
  void SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => undefined);
}

async function persist() {
  try {
    // Trimmed from the front, so the most recently opened are the ones kept.
    const ids = [...seen].slice(-REMEMBER_LIMIT);
    if (ids.length !== seen.size) seen = new Set(ids);

    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Losing this only means rows look unread again after a reinstall.
  }
}
