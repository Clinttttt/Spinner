import { StyleSheet, View } from "react-native";

import { SkeletonPulse } from "../../../components/common/SkeletonPulse";
import {
  bookingDetailsCardStyle,
  bookingDetailsColors,
} from "./bookingDetailsTheme";

export function BookingDetailsSkeleton() {
  return (
    <SkeletonPulse
      accessibilityLabel="Loading booking details"
      style={styles.container}
    >
      <View style={[styles.card, styles.summaryCard]}>
        <View style={styles.row}>
          <View style={styles.avatar} />
          <View style={styles.copy}>
            <View style={styles.nameLine} />
            <View style={styles.badges}>
              <View style={styles.badge} />
              <View style={styles.badge} />
            </View>
            <View style={styles.metaLine} />
            <View style={styles.longMetaLine} />
          </View>
          <View style={styles.callButton} />
        </View>
        <View style={styles.tracker} />
      </View>

      <View style={[styles.card, styles.servicesCard]}>
        <View style={styles.sectionTitle} />
        {[0, 1, 2].map((item) => (
          <View key={item} style={styles.serviceRow}>
            <View style={styles.serviceIcon} />
            <View style={styles.serviceCopy}>
              <View style={styles.serviceName} />
              <View style={styles.serviceSubtitle} />
            </View>
            <View style={styles.amount} />
          </View>
        ))}
        <View style={styles.paymentStrip} />
      </View>

      <View style={[styles.card, styles.smallCard]} />
      <View style={[styles.card, styles.smallCard]} />
    </SkeletonPulse>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  card: {
    ...bookingDetailsCardStyle,
    padding: 18,
  },
  summaryCard: {
    minHeight: 232,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  avatar: {
    backgroundColor: "#EEF1F4",
    borderRadius: 22,
    height: 64,
    width: 64,
  },
  copy: {
    flex: 1,
    gap: 9,
    paddingTop: 2,
  },
  nameLine: {
    backgroundColor: "#E8ECF1",
    borderRadius: 5,
    height: 18,
    width: "68%",
  },
  badges: {
    flexDirection: "row",
    gap: 7,
  },
  badge: {
    backgroundColor: "#F0F2F5",
    borderRadius: 8,
    height: 26,
    width: 50,
  },
  metaLine: {
    backgroundColor: "#EEF1F4",
    borderRadius: 4,
    height: 12,
    width: "82%",
  },
  longMetaLine: {
    backgroundColor: "#F2F4F7",
    borderRadius: 4,
    height: 12,
    width: "94%",
  },
  callButton: {
    backgroundColor: "#F2F4F7",
    borderRadius: 16,
    height: 52,
    width: 52,
  },
  tracker: {
    backgroundColor: "#F3F5F8",
    borderRadius: 18,
    height: 76,
    marginTop: 16,
  },
  servicesCard: {
    gap: 14,
  },
  sectionTitle: {
    backgroundColor: "#E8ECF1",
    borderRadius: 5,
    height: 18,
    width: 82,
  },
  serviceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  serviceIcon: {
    backgroundColor: "#EEF1F4",
    borderRadius: 14,
    height: 44,
    width: 44,
  },
  serviceCopy: {
    flex: 1,
    gap: 7,
  },
  serviceName: {
    backgroundColor: "#E8ECF1",
    borderRadius: 4,
    height: 14,
    width: "55%",
  },
  serviceSubtitle: {
    backgroundColor: "#F2F4F7",
    borderRadius: 4,
    height: 11,
    width: "72%",
  },
  amount: {
    backgroundColor: "#EEF1F4",
    borderRadius: 4,
    height: 15,
    width: 58,
  },
  paymentStrip: {
    backgroundColor: bookingDetailsColors.surface,
    borderColor: bookingDetailsColors.controlBorder,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
  },
  smallCard: {
    minHeight: 106,
  },
});
