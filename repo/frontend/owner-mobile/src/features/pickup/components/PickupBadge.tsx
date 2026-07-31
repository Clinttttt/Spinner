import { StyleSheet, Text, View } from "react-native";

import type { PaymentStatus, PickupStatus } from "../models/pickup";
import { pickupColors } from "./pickupTheme";

type PickupBadgeValue = PaymentStatus | PickupStatus | "needsConfirmation";

const badgeLabels: Record<PickupBadgeValue, string> = {
  cod: "COD",
  needsConfirmation: "Needs Confirmation",
  paid: "Paid",
  unpaid: "Unpaid",
  pending: "Pending",
  onRoute: "On Route",
  pickedUp: "Picked Up",
};

/** Values that need the owner's attention are tinted instead of neutral. */
const attentionValues = new Set<PickupBadgeValue>(["needsConfirmation"]);

export function PickupBadge({
  compact = false,
  value,
}: {
  compact?: boolean;
  value: PickupBadgeValue;
}) {
  const label = badgeLabels[value];
  const attention = attentionValues.has(value);

  return (
    <View
      accessibilityLabel={label}
      style={[
        styles.badge,
        compact && styles.compactBadge,
        attention && styles.attentionBadge,
      ]}
    >
      <Text style={[styles.text, attention && styles.attentionText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  attentionBadge: {
    backgroundColor: "#FFF7DF",
    borderColor: "#F0D492",
  },
  attentionText: {
    color: "#B36F00",
    fontWeight: "700",
  },
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
  text: {
    color: pickupColors.textPrimary,
    fontSize: 10.5,
    fontWeight: "500",
    lineHeight: 14,
  },
  compactBadge: {
    paddingHorizontal: 8,
  },
});
