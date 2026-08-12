/**
 * How the owner reaches whoever supports this app.
 *
 * The Help Center used to print the fixed string "Support contact not configured" whatever
 * the situation, and the "Contact support" link on an order was wired to nothing at all, so
 * an owner with a problem had nowhere to go.
 *
 * Configured per build rather than stored with the shop, because this is support for the
 * software, not the laundromat's own phone number — pointing it at the shop would have the
 * owner calling themselves. `EXPO_PUBLIC_` variables are inlined at build time, so a build
 * that has no channel configured can say so honestly instead of offering a dead link.
 */
const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() ?? "";
const url = process.env.EXPO_PUBLIC_SUPPORT_URL?.trim() ?? "";

export const supportConfig = {
  email,
  url,
  hasEmail: email.length > 0,
  hasUrl: url.length > 0,
  /** True when there is at least one way to make contact from inside the app. */
  isConfigured: email.length > 0 || url.length > 0,
} as const;
