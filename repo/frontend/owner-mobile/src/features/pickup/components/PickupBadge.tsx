import { StyleSheet, Text, View } from "react-native";

import type { PaymentStatus, PickupStatus } from "../models/pickup";
import { pickupColors } from "./pickupTheme";

type PickupBadgeValue = PaymentStatus | PickupStatus | "needsConfirmation";

const badgeLabels: Record<PickupBadgeValue, string> = {
  cod: "COD",
  // Short on purpose: the card is narrow and the long form pushed the
  // customer name into an ellipsis.
  needsConfirmation: "Awaiting",
  paid: "Paid",
  unpaid: "Unpaid",
  pending: "Pending",
  onRoute: "On Route",
  pickedUp: "Picked Up",
};

export function PickupBadge({
  compact = false,
  value,
}: {
  compact?: boolean;
  value: PickupBadgeValue;
}) {
  const label = badgeLabels[value];

  return (
    <View
      accessibilityLabel={label}
      style={[styles.badge, compact && styles.compactBadge]}
    >
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: pickupColors.surface,
    borderColor: pickupColors.borderStrong,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    height: 26,
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  compactBadge: {
    paddingHorizontal: 8,
  },
  text: {
    color: pickupColors.textPrimary,
    fontSize: 10.5,
    fontWeight: "500",
    lineHeight: 14,
  },
});
