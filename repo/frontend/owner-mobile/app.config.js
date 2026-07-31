// `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is the variable to set in every EAS
// environment. The `EXPO_PUBLIC_` prefix means the JS bundle can also see
// whether a key was supplied, so the pickup screen can say "map service is not
// configured for this build" instead of rendering a blank grey rectangle.
// `GOOGLE_MAPS_ANDROID_API_KEY` is still accepted for existing local setups.
const mapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
  process.env.GOOGLE_MAPS_ANDROID_API_KEY ??
  "";

module.exports = {
  expo: {
    name: "Spinner",
    // The slug stays tied to the existing EAS project (projectId below).
    // Renaming it would detach the app from its build history.
    slug: "owner-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon-spinner-app.png",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
    },
    android: {
      package: "com.engrspin.owner",
      softwareKeyboardLayoutMode: "resize",
      adaptiveIcon: {
        backgroundColor: "#FFFFFF",
        foregroundImage: "./assets/icon-spinner-app-adaptive.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/icon-spinner-app.png",
    },
    plugins: [
      "expo-status-bar",
      "expo-font",
      "expo-video",
      "@react-native-community/datetimepicker",
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: mapsApiKey,
        },
      ],
      "expo-secure-store",
      "expo-sqlite",
      [
        // Without this plugin Android 12+ falls back to its system splash: a
        // small launcher icon on a black background.
        "expo-splash-screen",
        {
          backgroundColor: "#0D2A52",
          image: "./assets/icon-spinner-app.png",
          imageWidth: 260,
          resizeMode: "contain",
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "9e8e427c-9064-4071-9c27-ff352f96037e",
      },
    },
  },
};
