import { StyleSheet, View } from "react-native";

import { SkeletonPulse } from "../../../components/common/SkeletonPulse";
import { colors } from "../../../theme/colors";

/**
 * Placeholder for the order ledger while the first page arrives.
 *
 * Replaces a centred spinner with the caption "Loading order history...". A shape that
 * matches the rows about to appear means the page does not jump when they do, and it
 * matches how every other list in the app loads. Row heights and the card follow
 * TransactionSkeleton so the two ledgers load identically.
 */
export function OrderHistorySkeleton() {
  return (
    <SkeletonPulse
      accessibilityLabel="Loading order history"
      style={styles.card}
    >
      {[0, 1, 2, 3, 4].map((item) => (
        <View key={item} style={styles.row}>
          <View style={[styles.block, styles.icon]} />
          <View style={styles.copy}>
            <View style={[styles.block, styles.name]} />
            <View style={[styles.block, styles.meta]} />
          </View>
          <View style={styles.trailing}>
            <View style={[styles.block, styles.amount]} />
            <View style={[styles.block, styles.status]} />
          </View>
        </View>
      ))}
    </SkeletonPulse>
  );
}

const styles = StyleSheet.create({
  amount: { height: 15, width: 68 },
  block: { backgroundColor: colors.surfaceSoft, borderRadius: 8 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  copy: { flex: 1, gap: 7 },
  icon: { borderRadius: 22, height: 44, width: 44 },
  meta: { height: 12, width: "68%" },
  name: { height: 15, width: "52%" },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    height: 72,
  },
  status: { height: 12, width: 52 },
  trailing: { alignItems: "flex-end", gap: 7 },
});
