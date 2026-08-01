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
const mascot = require("../../../assets/loading/mascot.webp");
const wordmark = require("../../../assets/loading/wordmark.webp");

interface AppLoadingScreenProps {
  message?: string;
}

/**
 * First screen after launch.
 *
 * Sized from the viewport rather than fixed pixels so the composition holds on a
 * small 360dp phone and on a tall device: the swirl anchors the top, the mascot
 * sits on the optical centre, and the wordmark, caption, and progress bar stack
 * beneath it exactly as in the approved reference.
 */
export function AppLoadingScreen({
  message = "Loading your dashboard",
}: AppLoadingScreenProps) {
  const { height, width } = useWindowDimensions();
  // useMemo rather than a ref: reading ref.current during render is disallowed.
  const progress = useMemo(() => new Animated.Value(0), []);

  const mascotSize = Math.min(width * 0.62, height * 0.32);
  const wordmarkWidth = Math.min(width * 0.56, 260);
  const swirlSize = Math.min(width * 1.35, height * 0.72);

  useEffect(() => {
    // An indeterminate sweep: the real work has no measurable percentage, so the
    // bar communicates activity rather than a fake completion figure.
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          duration: 900,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          duration: 700,
          easing: Easing.in(Easing.cubic),
          toValue: 0.15,
          useNativeDriver: false,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [progress]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["12%", "92%"],
  });

  return (
    <View style={styles.screen}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={swirlBackground}
        style={[
          styles.swirl,
          { height: swirlSize, top: -swirlSize * 0.16, width: swirlSize },
        ]}
      />

      <View style={styles.content}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={mascot}
          style={{ height: mascotSize, width: mascotSize }}
        />

        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel="Spinner"
          resizeMode="contain"
          source={wordmark}
          style={[styles.wordmark, { width: wordmarkWidth }]}
        />

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
  barFill: {
    backgroundColor: colors.navy,
    borderRadius: 999,
    height: "100%",
  },
  barTrack: {
    backgroundColor: "#E7EDF6",
    borderRadius: 999,
    height: 9,
    marginTop: 22,
    overflow: "hidden",
    width: "78%",
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  message: {
    color: colors.textSecondary,
    fontSize: 15,
    letterSpacing: 0.1,
    marginTop: 18,
    textAlign: "center",
  },
  screen: {
    alignItems: "center",
    backgroundColor: "#F7FAFF",
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  swirl: {
    opacity: 0.95,
    position: "absolute",
  },
  wordmark: {
    height: 62,
    marginTop: 6,
  },
});
