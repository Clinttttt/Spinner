import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";

import { apiRequest } from "../../../api/apiClient";

/**
 * The Android channel the notifications arrive on.
 *
 * Must match the channel_id the backend sends, or Android silently files the message
 * under a default channel the owner never configured — which on some versions means it
 * arrives without a sound.
 */
const BOOKINGS_CHANNEL = "bookings";

/**
 * The token this device last registered.
 *
 * Held so sign-out can release the right one. Reading it back from the operating system
 * at sign-out is not reliable: permission may have been revoked by then, which is
 * exactly when releasing matters most.
 */
let registeredToken: string | null = null;

export function getRegisteredPushToken() {
  return registeredToken;
}

function platform() {
  if (Platform.OS === "android") return "Android";
  if (Platform.OS === "ios") return "Ios";
  return "Web";
}

/**
 * Prepares the Android channel that notifications will use.
 *
 * Created before any permission request, because Android needs the channel to exist for
 * the notification to be categorised, and the owner may adjust its importance in system
 * settings afterwards.
 */
async function ensureChannelAsync() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(BOOKINGS_CHANNEL, {
    name: "Bookings",
    description: "New bookings and jobs that need attention.",
    importance: Notifications.AndroidImportance.HIGH,
    // A booking is worth a sound. This is the shop's livelihood arriving.
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
  });
}

/**
 * Asks for permission and hands the device's token to the API.
 *
 * Called after every sign-in rather than once, because the operating system can rotate
 * the token at any time and a stale one simply stops receiving anything, with no error
 * to notice.
 *
 * Never throws. A phone that will not accept notifications is a reduced experience, not
 * a failed sign-in, and the owner should not be shown an error for it.
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  try {
    // A simulator has no push service to register with, so asking produces a confusing
    // failure rather than a useful one.
    if (!Device.isDevice) return null;

    await ensureChannelAsync();

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;

    if (!granted && existing.canAskAgain) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }

    if (!granted) return null;

    // The device's own Firebase token, not an Expo push token: the backend talks to
    // Firebase Cloud Messaging directly, so it needs the address Firebase recognises.
    const token = await Notifications.getDevicePushTokenAsync();

    if (!token?.data) return null;

    await apiRequest("/api/devices/register", {
      body: {
        deviceName: Device.deviceName ?? Device.modelName ?? null,
        platform: platform(),
        registrationToken: token.data,
      },
      method: "POST",
    });

    registeredToken = token.data;

    return token.data;
  } catch {
    // Deliberately quiet. Push is an addition to the app, and the owner losing
    // notifications must never stop them signing in and running the shop.
    return null;
  }
}

/**
 * Whether this phone will actually show the shop's alerts.
 *
 * Exposed so the app can say so plainly. A denied permission is otherwise completely
 * silent: registration gives up, no push is ever queued, and the owner is left thinking
 * the feature is broken with nothing on screen to suggest why.
 */
export async function getPushPermissionStateAsync(): Promise<PushPermission> {
  try {
    if (!Device.isDevice) return "unavailable";

    const status = await Notifications.getPermissionsAsync();
    if (status.granted) return "granted";

    return status.canAskAgain ? "canAsk" : "blocked";
  } catch {
    return "unavailable";
  }
}

export type PushPermission = "granted" | "canAsk" | "blocked" | "unavailable";

/**
 * Retries registration when the app comes back to the foreground.
 *
 * Only when this phone is not already registered, so switching between apps does not
 * mean a request every time. It exists because the two ways registration fails are both
 * recoverable outside the app and neither raises anything: the owner declines the
 * permission prompt and is never asked again because they are already signed in, or they
 * grant it later in system settings and nothing notices. Sign-in is too rare an event to
 * be the only opportunity to fix either.
 */
export function watchForForegroundRegistration() {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state !== "active") return;
    if (registeredToken) return;

    void registerForPushNotificationsAsync();
  });

  return () => subscription.remove();
}

/**
 * Stops this phone receiving the shop's notifications.
 *
 * Called on sign-out, so someone who hands the counter phone back is not still told
 * about every booking the shop takes.
 */
export async function releasePushNotificationsAsync() {
  const token = registeredToken;
  if (!token) return;

  // Cleared first, so a failed call cannot leave the app believing it is still
  // registered and skip the attempt next time.
  registeredToken = null;

  try {
    await apiRequest("/api/devices/release", {
      body: { registrationToken: token },
      method: "POST",
    });
  } catch {
    // The session is ending either way. The server retires the device the next time
    // Firebase reports the token as unknown.
  }
}

/**
 * Watches for the operating system replacing this device's token.
 *
 * Firebase reissues a token after a reinstall, a restore to a new handset, or its own
 * housekeeping. The old one then stops working and the shop goes quiet with nothing to
 * indicate why, so the replacement is recorded as soon as it is handed to us rather than
 * waiting for the next sign-in.
 */
export function watchForPushTokenChanges() {
  const subscription = Notifications.addPushTokenListener((token) => {
    if (typeof token?.data !== "string" || token.data.length === 0) return;
    if (token.data === registeredToken) return;

    void apiRequest("/api/devices/register", {
      body: {
        deviceName: Device.deviceName ?? Device.modelName ?? null,
        platform: platform(),
        registrationToken: token.data,
      },
      method: "POST",
    })
      .then(() => {
        registeredToken = token.data;
      })
      .catch(() => undefined);
  });

  return () => subscription.remove();
}
