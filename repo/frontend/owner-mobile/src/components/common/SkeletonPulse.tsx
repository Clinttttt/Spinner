import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";

/** Faint enough to read as inactive, not so faint that the layout disappears. */
const DIM = 0.55;

interface SkeletonPulseProps {
  accessibilityLabel: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Breathes a placeholder in and out while real content is on its way.
 *
 * A flat grey block reads as a rendering fault rather than as loading, especially on the
 * screens where one of the blocks is a map. A slow pulse says the screen is working.
 *
 * One animation drives the whole placeholder rather than one per block: it is a single
 * opacity on a single view, runs on the native driver so it survives a busy JS thread,
 * and moving the blocks independently would draw attention to itself.
 */
export function SkeletonPulse({
  accessibilityLabel,
  children,
  style,
}: SkeletonPulseProps) {
  // useMemo rather than a ref: reading ref.current during render is disallowed.
  const opacity = useMemo(() => new Animated.Value(DIM), []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          toValue: DIM,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    // Stopped on unmount so the loop does not keep the UI thread busy behind a screen
    // that has already finished loading.
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      style={[style, { opacity }]}
    >
      {children}
    </Animated.View>
  );
}
