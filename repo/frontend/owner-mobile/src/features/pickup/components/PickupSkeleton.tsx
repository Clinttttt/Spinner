import { StyleSheet, View } from "react-native";

import { SkeletonPulse } from "../../../components/common/SkeletonPulse";
import { colors } from "../../../theme/colors";
import { pickupTaskCardStyle } from "./pickupTheme";

function PickupSkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatar} />
        <View style={styles.copy}>
          <View style={styles.headingRow}>
            <View style={styles.name} />
            <View style={styles.badge} />
            <View style={styles.badge} />
          </View>
          <View style={styles.meta} />
          <View style={styles.address} />
          <View style={styles.tags}>
            <View style={styles.tag} />
            <View style={styles.longTag} />
          </View>
        </View>
      </View>
      <View style={styles.actionDivider} />
      <View style={styles.actions}>
        <View style={styles.smallAction} />
        <View style={styles.smallAction} />
        <View style={styles.primaryAction} />
      </View>
    </View>
  );
}

export function PickupSkeleton() {
  return (
    <SkeletonPulse
      accessibilityLabel="Loading pickup schedules"
      style={styles.list}
    >
      <PickupSkeletonCard />
      <PickupSkeletonCard />
      <PickupSkeletonCard />
    </SkeletonPulse>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: {
    ...pickupTaskCardStyle,
    alignSelf: "stretch",
    paddingBottom: 14,
    paddingHorizontal: 14,
    paddingTop: 14,
    width: "100%",
  },
  row: { flexDirection: "row" },
  avatar: {
    backgroundColor: "#EEF1F4",
    borderRadius: 18,
    flexShrink: 0,
    height: 52,
    width: 52,
  },
  copy: { flex: 1, gap: 7, marginLeft: 10, minWidth: 0 },
  headingRow: { flexDirection: "row", flexWrap: "nowrap", gap: 7 },
  name: { backgroundColor: "#E8ECF1", borderRadius: 5, flex: 1, height: 15 },
  badge: { backgroundColor: "#F0F2F5", borderRadius: 8, height: 26, width: 44 },
  meta: {
    backgroundColor: "#EEF1F4",
    borderRadius: 4,
    height: 12,
    width: "48%",
  },
  address: {
    backgroundColor: "#F2F4F7",
    borderRadius: 4,
    height: 12,
    width: "82%",
  },
  tags: { flexDirection: "row", gap: 7, marginTop: 5 },
  tag: { backgroundColor: "#EEF1F4", borderRadius: 10, height: 28, width: 70 },
  longTag: {
    backgroundColor: "#F2F4F7",
    borderRadius: 10,
    height: 28,
    width: 112,
  },
  actionDivider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginBottom: 12,
    marginTop: 14,
  },
  actions: { flexDirection: "row", gap: 8 },
  smallAction: {
    backgroundColor: "#F2F4F7",
    borderRadius: 14,
    height: 48,
    width: 52,
  },
  primaryAction: {
    backgroundColor: "#EEF1F4",
    borderRadius: 14,
    flex: 1,
    height: 48,
  },
});
