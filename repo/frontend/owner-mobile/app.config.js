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
      // Set explicitly so a build made on this machine is not a downgrade. EAS assigns
      // this remotely (appVersionSource: remote in eas.json) and ignores the value here,
      // so a local build otherwise defaulted to 1 and Android refused to install it over
      // an EAS build that had already reached 23.
      versionCode: 24,
      // Firebase client configuration, which is what lets Cloud Messaging issue this
      // app a device token. Kept out of the repository because it is public and the
      // file carries the project's Android API key: EAS supplies it as a file secret
      // during a build, and the local path is the fallback for building here.
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
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
      [
        "expo-notifications",
        {
          // Android draws the status bar notification icon as a silhouette, so a full
          // colour logo comes out as a white square. The monochrome asset already used
          // for the adaptive icon is exactly the right shape for this.
          icon: "./assets/android-icon-monochrome.png",
          color: "#0D2A52",
        },
      ],
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
        // Used only by Settings -> Pickup Service Area, so the owner can capture
        // the shop's coordinates by standing at the shop instead of typing them.
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Spinner uses your location only when you tap Use my current location, to set the laundromat's pickup centre.",
          locationWhenInUsePermission:
            "Spinner uses your location only when you tap Use my current location, to set the laundromat's pickup centre.",
          isAndroidBackgroundLocationEnabled: false,
        },
      ],
      [
        // Without this plugin Android 12+ falls back to its system splash: a
        // small launcher icon on a black background.
        //
        // Android 12+ treats this image as the splash *icon* and masks it, keeping
        // roughly the inner 192dp of a 288dp area. A previous version stacked the
        // mascot and the wordmark here and the wordmark was sliced in half on
        // device, so the launch screen shows the mascot alone; AppLoadingScreen
        // draws the wordmark, swirl, and progress bar once React is up.
        //
        // 180dp is under the 187dp ceiling that scripts/build-branding-assets.ps1
        // calculates from how far the artwork actually reaches from its centre.
        "expo-splash-screen",
        {
          backgroundColor: "#F7FAFF",
          image: "./assets/splash-spinner.png",
          imageWidth: 180,
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
