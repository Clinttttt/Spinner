# Spinner — Owner Mobile

React Native owner/staff application built with Expo SDK 56.

The Android app is presented to users as **Spinner**
(`expo.name` in `app.config.js`). The Expo `slug` stays `owner-mobile` because
it is bound to the existing EAS project id and build history; renaming it would
detach the app from its builds. The folder name is unchanged for the same
reason.

## Local setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env.local`.

3. Set `EXPO_PUBLIC_API_BASE_URL` to an address the device can reach:

   ```text
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:5235
   ```

   Do not use `localhost` for a physical phone. Keep the phone and backend
   computer on the same network and allow TCP port `5235` through the local
   firewall.

4. Start the backend, then Metro:

   ```powershell
   npx expo start --dev-client
   ```

## Native dependency rebuilds

`expo-secure-store`, `expo-sqlite`, `react-native-maps`, and NetInfo contain
native code. Installing one of these packages only updates JavaScript
dependencies; an already-installed development client will not gain the
native module.

After changing native dependencies or `app.config.js`, create and install a
fresh native client:

```powershell
npx expo prebuild --clean
npx expo run:android
```

Alternatively, create a new EAS development build:

```powershell
eas build --profile development --platform android
```

The `Cannot find native module 'ExpoSecureStore'` error means the installed
APK predates the dependency. Clearing Metro's cache alone cannot fix that
native binary mismatch.

## Offline behavior

- Successful GET responses are cached in SQLite per signed-in user.
- Cached records expire after 30 days.
- Previously loaded bookings, pickups, transaction history, reports, and
  settings can be viewed without a network connection.
- Creating orders, changing statuses, payments, and account/settings updates
  remain online-only and show a clear offline error.
- Signing out clears that user's cached business data from the device.
- Authentication tokens are stored in SecureStore, never SQLite.

Offline mode is a read-only continuity feature. It is not an offline mutation
queue and never fabricates server success.

## Production configuration

Set these values in the EAS build environment; do not commit them:

```text
EXPO_PUBLIC_API_BASE_URL=https://api.example.com
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` replaces the older
`GOOGLE_MAPS_ANDROID_API_KEY` (still accepted as a fallback). The
`EXPO_PUBLIC_` prefix matters: it lets the JS bundle detect that a key was
supplied, so the Pickup Location screen can say "Map service not configured"
instead of showing an empty grey card. A production APK built without this
variable renders a blank native map.

The splash screen comes from the `expo-splash-screen` plugin in
`app.config.js`. Changing it requires a new native build; Android 12+ otherwise
falls back to a small launcher icon on a black background.

The optional `EXPO_PUBLIC_OWNER_LOGIN` and
`EXPO_PUBLIC_OWNER_PASSWORD` variables only prefill the development login
form. Do not configure them in production.

## Validation

```powershell
npm run typecheck
npm run lint
npm run format:check
npx expo-doctor
```

