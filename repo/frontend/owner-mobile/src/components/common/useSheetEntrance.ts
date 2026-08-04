import { useEffect, useMemo } from "react";
import { Animated, Easing } from "react-native";

/**
 * The entrance used by every sheet in the app.
 *
 * React Native's `animationType="slide"` travels the full height of the sheet, so
 * a filter panel appeared to be thrown up from off screen and the backdrop darkened
 * separately on the way. Pairing `animationType="fade"` with this instead brings the
 * backdrop and the panel in together, with a short settle rather than a journey, so
 * tapping a control produces something that simply appears where it belongs.
 */
export function useSheetEntrance() {
  // useMemo rather than a ref: reading ref.current during render is disallowed.
  const progress = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(progress, {
      duration: 180,
      easing: Easing.out(Easing.quad),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };
}
