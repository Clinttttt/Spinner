import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import type { PickupLocationDetails } from "../models/pickupLocation";
import { PickupBadge } from "./PickupBadge";
import { PickupTag } from "./PickupTag";

interface PickupCustomerSummaryCardProps {
  compact: boolean;
  details: PickupLocationDetails;
}

export function PickupCustomerSummaryCard({
  compact,
  details,
}: PickupCustomerSummaryCardProps) {
  const accessibilitySummary = [
    details.customerName,
    `pickup at ${details.pickupTime}`,
    details.location.formattedAddress || details.shortAddress,
    details.location.landmark ? `Landmark ${details.location.landmark}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <View
      accessibilityLabel={accessibilitySummary}
      style={[styles.card, compact && styles.compactCard]}
    >
      <View style={[styles.avatar, compact && styles.compactAvatar]}>
        <Ionicons color={colors.navy} name="person-outline" size={26} />
      </View>
      <View style={styles.content}>
        <Text
          numberOfLines={1}
          style={[styles.name, compact && styles.compactName]}
        >
          {details.customerName}
        </Text>
        <View style={[styles.metaWrap, compact && styles.compactMetaWrap]}>
          <View style={styles.timeGroup}>
            <Ionicons
              color={colors.textSecondary}
              name="time-outline"
              size={15}
            />
            <Text style={styles.metaText}>{details.pickupTime}</Text>
          </View>
          <PickupBadge compact value={details.paymentMethod} />
          <PickupBadge compact value={details.pickupStatus} />
        </View>
        <View style={styles.servicesWrap}>
          {details.services.map((service) => (
            <PickupTag
              compact
              key={service.id}
              service={service}
              serviceCount={details.services.length}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.pickupSoft,
    borderRadius: 20,
    flexShrink: 0,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 0,
    flexDirection: "row",
    gap: 12,
    padding: 16,
    shadowColor: colors.navy,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.012,
    shadowRadius: 8,
  },
  compactAvatar: { borderRadius: 18, height: 46, width: 46 },
  compactCard: { borderRadius: 18, gap: 10, padding: 12 },
  compactMetaWrap: { gap: 6, marginTop: 7 },
  compactName: { fontSize: 15, lineHeight: 20 },
  content: { flex: 1, minWidth: 0 },
  metaText: { color: colors.textSecondary, fontSize: 11.5, lineHeight: 16 },
  metaWrap: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 8,
  },
  name: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 21,
  },
  servicesWrap: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 7,
  },
  timeGroup: { alignItems: "center", flexDirection: "row", gap: 4 },
});
