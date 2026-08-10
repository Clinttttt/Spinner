import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import type { HomeActivity } from "../../features/home/models/homeDashboard";
import { colors } from "../../theme/colors";
import { radii } from "../../theme/radii";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const receiptIcon = require("../../../assets/icons/home/minimalist-paper.png");

interface ActivityRowProps {
  activity: HomeActivity;
  onPress?: (activity: HomeActivity) => void;
}

const activityBackground = {
  pickup: colors.pickupSoft,
  delivery: colors.deliverySoft,
  receipt: colors.receiptSoft,
} as const;

export function ActivityRow({ activity, onPress }: ActivityRowProps) {
  const { width } = useWindowDimensions();
  const compact = width <= 360;
  const handlePress = () => onPress?.(activity);

  return (
    <Pressable
      accessibilityLabel={`${activity.title}. ${activity.subtitle}`}
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: activityBackground[activity.type] },
        ]}
      >
        {activity.type === "receipt" ? (
          <Image
            fadeDuration={0}
            resizeMode="contain"
            source={receiptIcon}
            style={styles.receiptIcon}
          />
        ) : (
          <Ionicons
            color={activity.type === "delivery" ? colors.gold : colors.navy}
            name={
              activity.type === "delivery" ? "car-outline" : "person-outline"
            }
            size={24}
          />
        )}
      </View>

      <View style={styles.copy}>
        <Text
          numberOfLines={2}
          style={[styles.title, compact && styles.compactTitle]}
        >
          {activity.title}
        </Text>
        <Text numberOfLines={2} style={styles.subtitle}>
          {activity.subtitle}
        </Text>
      </View>

      <View style={styles.trailing}>
        {activity.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activity.badge}</Text>
          </View>
        ) : (
          <Text style={styles.meta}>{activity.meta}</Text>
        )}
        <Ionicons
          color={colors.textSecondary}
          name="chevron-forward"
          size={18}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 78,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  pressed: {
    backgroundColor: colors.surfaceSoft,
  },
  iconContainer: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  receiptIcon: {
    height: 66,
    width: 66,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.activityTitle,
    color: colors.navy,
  },
  compactTitle: {
    fontSize: 14.5,
  },
  subtitle: {
    ...typography.activitySubtitle,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trailing: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  badge: {
    backgroundColor: colors.pickupSoft,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 30,
    paddingHorizontal: 12,
  },
  badgeText: {
    ...typography.badgeLabel,
    color: colors.actionBlue,
  },
  meta: {
    ...typography.metadata,
    color: colors.textSecondary,
  },
});
