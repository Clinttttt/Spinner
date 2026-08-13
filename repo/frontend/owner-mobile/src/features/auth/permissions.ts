import type { AuthSession } from "../../api/apiClient";
import type { SettingsPageId } from "../settings/models/settings";

/**
 * What a signed-in person is allowed to do.
 *
 * Deliberately mirrors the OwnerOnly policy the API already enforces, rather than inventing
 * a second set of rules. The server is the authority — it answers 403 whether or not the app
 * asks — and this exists so the app can say "owner only" up front instead of letting someone
 * open a screen that then fails with a raw "Request failed with status 403".
 *
 * Staff are meant to run the day: take bookings, collect and deliver laundry, record payments
 * and add orders. What they cannot do is change what the shop charges, how it is configured,
 * who can sign in, or read the takings.
 *
 * When a controller's policy changes, change it here too. Getting them out of step does not
 * create a security hole, because the server still refuses, but it does put a lock on
 * something that works or let someone walk into a 403.
 */
export function isOwner(session: AuthSession | undefined): boolean {
  return session?.role === "Owner";
}

/**
 * Settings pages the API will refuse for staff.
 *
 * Derived from the controllers: BusinessSettingsController, ServicesPricingController and
 * StaffController all carry OwnerOnly, so every page that saves through them is owner work.
 * Reading the shop's details is allowed — the GET is anonymous — which is why the settings
 * overview still fills in for staff.
 */
export const ownerOnlySettingsPages: readonly SettingsPageId[] = [
  "business",
  "hours",
  "notifications",
  "payments",
  "pickupArea",
  "services",
  "staff",
];

export function isOwnerOnlyPage(page: SettingsPageId): boolean {
  return ownerOnlySettingsPages.includes(page);
}

/**
 * What to tell someone who cannot open a thing.
 *
 * Names the reason and who to ask, rather than only refusing. A bare "not allowed" leaves
 * someone wondering whether the app is broken.
 */
export const ownerOnlyNotice = {
  message:
    "Only the shop owner can open this. Ask them if it needs changing. You can still take bookings, run pickups and record payments.",
  title: "Owner only",
} as const;
