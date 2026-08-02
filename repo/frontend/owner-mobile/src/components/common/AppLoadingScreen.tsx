import { Image, StyleSheet, useWindowDimensions, View } from "react-native";

const background = require("../../../assets/backgrounds/login-background.webp");
const mascot = require("../../../assets/spinner-mascot.png");

/** Intrinsic aspect ratio of the prepared artwork. */
const MASCOT_ASPECT = 825 / 873;

/**
 * What is on screen while the saved session is restored.
 *
 * Deliberately identical to the native launch screen: the same mascot at the same
 * size on the same background. There used to be a second, different screen here
 * with a wordmark and a progress bar, which read as two loading screens in a row.
 * Matching the launch screen instead makes startup look like one screen that the
 * app simply continues, and the background gradient is the same one the login
 * screen uses, so that transition is quiet too.
 */
export function AppLoadingScreen() {
  const { height, width } = useWindowDimensions();

  // Matches the 180dp the launch screen icon is drawn at, so the mascot does not
  // change size when React takes over.
  const mascotWidth = Math.min(width * 0.46, height * 0.24 * MASCOT_ASPECT);

  return (
    <View style={styles.screen}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={background}
        style={styles.background}
      />
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="Spinner"
        resizeMode="contain"
        source={mascot}
        style={{ height: mascotWidth / MASCOT_ASPECT, width: mascotWidth }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  screen: {
    alignItems: "center",
    // The same flat colour the launch screen uses, so nothing flashes before the
    // gradient decodes.
    backgroundColor: "#F7FAFF",
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
});
