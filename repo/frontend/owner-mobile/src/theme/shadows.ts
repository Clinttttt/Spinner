import { Platform, type ViewStyle } from "react-native";

function platformShadow(
  shadowOpacity: number,
  shadowRadius: number,
  offsetY: number,
  androidElevation = 0,
): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: "#0D2A52",
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity,
      shadowRadius,
    },
    android: {
      elevation: androidElevation,
    },
    default: {
      shadowColor: "#0D2A52",
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity,
      shadowRadius,
    },
  });
}

export const assistantShadow = platformShadow(0.045, 18, 8, 1);
export const compactCardShadow = platformShadow(0.025, 12, 4);
export const activityShadow = platformShadow(0.02, 10, 3);
export const speechShadow = platformShadow(0.025, 8, 3);
export const controlShadow = platformShadow(0.02, 8, 2);
export const cardShadow = compactCardShadow;
