import { StyleSheet, type ViewStyle } from "react-native";

import type { BookingServiceType } from "../models/bookingDetails";

export const bookingDetailsColors = {
  surface: "#FFFFFF",
  surfaceSoft: "#FBFCFE",
  avatarSurface: "#F7F9FC",

  textPrimary: "#0D2A52",
  textSecondary: "#667085",
  textMuted: "#98A2B3",
  trackerText: "#475467",

  border: "#EEF1F4",
  borderStrong: "#DDE3EA",
  controlBorder: "#E2E8F0",

  activeBlue: "#175CD3",
  activeBlueSoft: "#EEF5FF",

  serviceBlue: {
    background: "#EEF5FF",
    border: "#D9E8FF",
    icon: "#175CD3",
  },
  serviceLavender: {
    background: "#F4F0FF",
    border: "#E4DAFF",
    icon: "#4F2CA8",
  },

  primaryAction: "#0D2A52",
} as const;

export const bookingDetailsCardStyle = {
  backgroundColor: bookingDetailsColors.surface,
  borderColor: bookingDetailsColors.border,
  borderRadius: 20,
  borderWidth: StyleSheet.hairlineWidth,
  elevation: 0,
  shadowColor: "#0D2A52",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.015,
  shadowRadius: 8,
} satisfies ViewStyle;

type ServiceAccent = "serviceBlue" | "serviceLavender";

const serviceAccentByType: Record<BookingServiceType, ServiceAccent> = {
  washFold: "serviceBlue",
  dropOff: "serviceBlue",
  pickup: "serviceBlue",
  dryOnly: "serviceLavender",
  selfService: "serviceLavender",
  delivery: "serviceLavender",
};

export function getBookingDetailsServicePalette(type: BookingServiceType) {
  return bookingDetailsColors[serviceAccentByType[type]];
}
