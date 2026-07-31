/**
 * Whether this binary was built with a Google Maps key.
 *
 * `EXPO_PUBLIC_` variables are inlined into the JS bundle at build time, so the
 * app can tell the difference between "the customer never shared a pin" and
 * "this build cannot draw maps at all". Without that distinction a missing key
 * looks identical to missing coordinates: an empty grey card with no way for the
 * owner to know who should fix it.
 */
export const mapsConfig = {
  isConfigured: Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()),
} as const;
