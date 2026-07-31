import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import type { BookingStatus, PaymentStatus } from "../models/booking";

type BadgeValue = BookingStatus | PaymentStatus;

interface BookingBadgeProps {
  borderColor?: string;
  labelOverride?: string;
  value: BadgeValue;
}

const badgeLabels: Record<BadgeValue, string> = {
  cod: "COD",
  paid: "Paid",
  unpaid: "Unpaid",
  new: "New",
  confirmed: "Confirmed",
  inProcess: "In Process",
  ready: "Ready",
  completed: "Completed",
};

export function BookingBadge({
  borderColor,
  labelOverride,
  value,
}: BookingBadgeProps) {
  const label = labelOverride ?? badgeLabels[value];

  return (
    <View
      accessibilityLabel={label}
      style={[styles.badge, borderColor ? { borderColor } : null]}
    >
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    height: 30,
    justifyContent: "center",
    paddingHorizontal: 11,
  },
  text: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
});
