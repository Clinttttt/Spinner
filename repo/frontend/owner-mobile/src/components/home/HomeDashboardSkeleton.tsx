import { StyleSheet, View } from "react-native";

import { colors } from "../../theme/colors";
import { radii } from "../../theme/radii";
import { spacing } from "../../theme/spacing";

export function HomeDashboardSkeleton() {
  return (
    <View
      accessibilityLabel="Loading dashboard"
      accessibilityRole="progressbar"
    >
      <View style={styles.headerRow}>
        <View style={styles.logo} />
        <View style={styles.headerCopy}>
          <View style={[styles.block, styles.brandTitle]} />
          <View style={[styles.block, styles.brandSubtitle]} />
        </View>
        <View style={styles.circle} />
        <View style={styles.circle} />
      </View>
      <View style={[styles.block, styles.greeting]} />
      <View style={[styles.block, styles.greetingSubtitle]} />
      <View style={styles.largeCard} />
      <View style={styles.priorityCard} />
      <View style={[styles.block, styles.sectionTitle]} />
      <View style={styles.activityCard}>
        <View style={styles.activityRow} />
        <View style={styles.divider} />
        <View style={styles.activityRow} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.sm,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  logo: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  brandTitle: {
    height: 18,
    width: 104,
  },
  brandSubtitle: {
    height: 12,
    width: 88,
  },
  circle: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.pill,
    height: 44,
    width: 44,
  },
  greeting: {
    height: 30,
    marginTop: spacing.xxl,
    width: "70%",
  },
  greetingSubtitle: {
    height: 16,
    marginTop: spacing.xs,
    width: "58%",
  },
  largeCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.xl,
    height: 280,
    marginTop: spacing.xl,
  },
  priorityCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.xl,
    height: 158,
    marginTop: 20,
  },
  sectionTitle: {
    height: 24,
    marginTop: spacing.xl,
    width: 92,
  },
  activityCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.xl,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  activityRow: {
    height: 78,
  },
  divider: {
    backgroundColor: colors.divider,
    height: StyleSheet.hairlineWidth,
  },
});
