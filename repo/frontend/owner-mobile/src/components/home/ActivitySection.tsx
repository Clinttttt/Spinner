import { Pressable, StyleSheet, Text, View } from "react-native";

import type { HomeActivity } from "../../features/home/models/homeDashboard";
import { colors } from "../../theme/colors";
import { radii } from "../../theme/radii";
import { activityShadow } from "../../theme/shadows";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { ActivityRow } from "./ActivityRow";

interface ActivitySectionProps {
  activities: HomeActivity[];
  onActivityPress?: (activity: HomeActivity) => void;
  onViewAllPress: () => void;
}

export function ActivitySection({
  activities,
  onActivityPress,
  onViewAllPress,
}: ActivitySectionProps) {
  return (
    <View>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Activity</Text>
        <Pressable
          accessibilityLabel="View all activity"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onViewAllPress}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.viewAll}>View all</Text>
        </Pressable>
      </View>

      <View style={styles.activityCard}>
        {activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No recent activity</Text>
            <Text style={styles.emptyBody}>
              New booking and order updates will appear here.
            </Text>
          </View>
        ) : (
          activities.map((activity, index) => (
            <View key={activity.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <ActivityRow activity={activity} onPress={onActivityPress} />
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  heading: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  viewAll: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.65,
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderColor: "#EFF2F5",
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    ...activityShadow,
  },
  divider: {
    backgroundColor: "#EDF0F4",
    height: StyleSheet.hairlineWidth,
    marginLeft: 72,
  },
  emptyState: {
    minHeight: 112,
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
});
