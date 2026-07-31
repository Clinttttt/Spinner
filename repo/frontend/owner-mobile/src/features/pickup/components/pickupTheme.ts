import { StyleSheet, type ViewStyle } from "react-native";

export const pickupColors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceSoft: "#F7F9FC",

  textPrimary: "#0D2A52",
  textSecondary: "#667085",
  textMuted: "#98A2B3",

  border: "#EEF1F4",
  borderStrong: "#DDE3EA",
  controlBorder: "#E2E8F0",

  serviceSingle: {
    background: "#EEF5FF",
    border: "#D9E8FF",
    icon: "#175CD3",
    text: "#174EA6",
  },
  serviceMultiple: {
    background: "#F4F0FF",
    border: "#E4DAFF",
    icon: "#4F2CA8",
    text: "#3F247F",
  },

  primaryAction: "#0D2A52",
} as const;

export const pickupOverviewCardStyle = {
  backgroundColor: pickupColors.surface,
  borderColor: pickupColors.border,
  borderRadius: 20,
  borderWidth: StyleSheet.hairlineWidth,
  elevation: 0,
  shadowColor: "#0D2A52",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.015,
  shadowRadius: 8,
} satisfies ViewStyle;

export const pickupTaskCardStyle = {
  backgroundColor: pickupColors.surface,
  borderColor: pickupColors.border,
  borderRadius: 20,
  borderWidth: StyleSheet.hairlineWidth,
  elevation: 0,
  shadowColor: "#0D2A52",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.015,
  shadowRadius: 8,
} satisfies ViewStyle;

export function getPickupServicePalette(serviceCount: number) {
  return serviceCount === 1
    ? pickupColors.serviceSingle
    : pickupColors.serviceMultiple;
}
