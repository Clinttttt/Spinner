import { useSyncExternalStore } from "react";

import { getAccountProfile } from "./accountService";

/**
 * The signed-in person's profile picture.
 *
 * Kept here rather than on the session for two reasons. The sign-in response does not carry
 * it, so a session-based copy would be absent until something fetched the profile anyway; and
 * the header appears on nearly every screen, so fetching per header would mean a request per
 * navigation and headers that disagree with each other while they load.
 *
 * Null is the normal state for anyone who has not uploaded a photo, which is why every reader
 * falls back to initials rather than treating this as missing data.
 */
const EMPTY: { photoUrl: string | null } = { photoUrl: null };

let identity = EMPTY;
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

export function useAccountPhoto() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Records a photo that has just been set, without another round trip.
 *
 * The screen that uploaded it already has the answer from the server, so asking again would
 * only add a delay before the header catches up.
 */
export function setAccountPhoto(photoUrl: string | null) {
  identity = { photoUrl: photoUrl?.trim() ? photoUrl.trim() : null };
  emitChange();
}

/**
 * Reads the signed-in person's photo.
 *
 * Shared while in flight, because several headers can mount at once on a first render.
 * Failures are ignored on purpose: the avatar falls back to initials, which is a better
 * outcome than an error over a picture.
 */
export function refreshAccountPhoto() {
  inFlight ??= getAccountProfile()
    .then((profile) => {
      identity = {
        photoUrl: profile.photoUrl?.trim() ? profile.photoUrl.trim() : null,
      };
      emitChange();
    })
    .catch(() => undefined)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Cleared on sign-out, so the next person does not briefly see the last one's face. */
export function resetAccountPhoto() {
  identity = EMPTY;
  inFlight = null;
  emitChange();
}
