import { useEffect, useMemo } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { colors } from "../../theme/colors";

const swirlBackground = require("../../../assets/loading/background.webp");
const mascot = require("../../../assets/spinner-mascot.png");
const wordmark = require("../../../assets/loading/wordmark.png");

/** Intrinsic aspect ratios of the prepared artwork. */
const MASCOT_ASPECT = 825 / 873;
const WORDMARK_ASPECT = 588 / 161;

/** Matches the splash colour in app.config.js so the handoff shows no flash. */
const SCREEN_BACKGROUND = "#F7FAFF";

interface AppLoadingScreenProps {
  message?: string;
}

/**
 * First screen the owner sees after launch.
 *
 * The mascot and wordmark are centred to the same place the native launch screen
 * puts them, so the logo does not jump when React takes over; the caption and
 * progress bar are anchored to the lower third and simply fade in. Everything is
 * sized from the viewport so the composition holds on a small phone and on a tall
 * one instead of relying on fixed pixel values.
 */
export function AppLoadingScreen({
  message = "Loading your dashboard",
}: AppLoadingScreenProps) {
  const { height, width } = useWindowDimensions();
  // useMemo rather than a ref: reading ref.current during render is disallowed.
  const progress = useMemo(() => new Animated.Value(0), []);

  // Fractions taken from the approved mock and checked against it at 320x640,
  // 360x800, and 430x932: the mascot occupies the upper 18-55% of the screen,
  // the wordmark sits below it, and the caption and bar hold the lower third.
  const mascotWidth = Math.min(width * 0.76, height * 0.37 * MASCOT_ASPECT);
  const wordmarkWidth = Math.min(width * 0.66, 330);

  useEffect(() => {
    // An indeterminate sweep. Startup has no measurable percentage, so the bar
    // shows that work is happening rather than inventing a completion figure.
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          duration: 950,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          duration: 750,
          easing: Easing.in(Easing.cubic),
          toValue: 0.18,
          useNativeDriver: false,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [progress]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["14%", "94%"],
  });

  return (
    <View style={styles.screen}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={swirlBackground}
        style={styles.background}
      />

      <View style={[styles.logo, { paddingTop: height * 0.185 }]}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={mascot}
          style={{ height: mascotWidth / MASCOT_ASPECT, width: mascotWidth }}
        />
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel="Spinner"
          resizeMode="contain"
          source={wordmark}
          style={{
            height: wordmarkWidth / WORDMARK_ASPECT,
            marginTop: height * 0.05,
            width: wordmarkWidth,
          }}
        />
      </View>

      <View style={[styles.footer, { bottom: height * 0.19 }]}>
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    // All four insets rather than a percentage size: a percentage would resolve
    // against the padded box and leave the artwork short of the screen edges.
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  barFill: {
    backgroundColor: colors.navy,
    borderRadius: 999,
    height: "100%",
  },
  barTrack: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E3EAF4",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 13,
    marginTop: 18,
    overflow: "hidden",
    width: "72%",
  },
  footer: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0,
  },
  logo: {
    alignItems: "center",
    flex: 1,
    // The vertical position comes from paddingTop, so the artwork lands at the
    // same fraction of the screen on any device instead of drifting with height.
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    width: "100%",
  },
  message: {
    color: colors.textSecondary,
    fontSize: 15,
    letterSpacing: 0.1,
    textAlign: "center",
  },
  screen: {
    backgroundColor: SCREEN_BACKGROUND,
    flex: 1,
    overflow: "hidden",
  },
});
