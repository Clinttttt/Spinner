import { StyleSheet, View } from "react-native";

import { SkeletonPulse } from "../../../components/common/SkeletonPulse";
import { colors } from "../../../theme/colors";

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.avatar} />
        <View style={styles.copy}>
          <View style={styles.headingRow}>
            <View style={styles.nameLine} />
            <View style={styles.badge} />
            <View style={styles.badge} />
          </View>
          <View style={styles.metaLine} />
          <View style={styles.addressLine} />
        </View>
      </View>
      <View style={styles.footerRow}>
        <View style={styles.tag} />
        <View style={styles.longTag} />
        <View style={styles.viewButton} />
      </View>
    </View>
  );
}

export function BookingsSkeleton() {
  return (
    <SkeletonPulse accessibilityLabel="Loading bookings" style={styles.list}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </SkeletonPulse>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    gap: 12,
  },
  avatar: {
    backgroundColor: "#EEF1F4",
    borderRadius: 16,
    height: 48,
    width: 48,
  },
  copy: {
    flex: 1,
    gap: 9,
    paddingTop: 2,
  },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  nameLine: {
    backgroundColor: "#E8ECF1",
    borderRadius: 5,
    height: 16,
    width: "38%",
  },
  badge: {
    backgroundColor: "#F0F2F5",
    borderRadius: 8,
    height: 24,
    width: 52,
  },
  metaLine: {
    backgroundColor: "#EEF1F4",
    borderRadius: 4,
    height: 12,
    width: "66%",
  },
  addressLine: {
    backgroundColor: "#F2F4F7",
    borderRadius: 4,
    height: 12,
    width: "82%",
  },
  footerRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 7,
    marginLeft: 60,
    marginTop: 12,
  },
  tag: {
    backgroundColor: "#EEF1F4",
    borderRadius: 8,
    height: 28,
    width: 64,
  },
  longTag: {
    backgroundColor: "#F2F4F7",
    borderRadius: 8,
    flex: 1,
    height: 28,
  },
  viewButton: {
    backgroundColor: "#EEF1F4",
    borderRadius: 11,
    height: 38,
    width: 70,
  },
});
