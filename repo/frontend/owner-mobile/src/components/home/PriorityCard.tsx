import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { colors } from "../../theme/colors";
import { radii } from "../../theme/radii";
import { compactCardShadow } from "../../theme/shadows";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

const bellIcon = require("../../../assets/icons/home/bell-icon.png");

interface PriorityCardProps {
  pendingBookingCount: number;
  onPress: () => void;
}

export function PriorityCard({
  pendingBookingCount,
  onPress,
}: PriorityCardProps) {
  const { width } = useWindowDimensions();
  const compact = width <= 360;
  const isCaughtUp = pendingBookingCount === 0;
  const title = isCaughtUp
    ? "You’re all caught up"
    : `${pendingBookingCount} ${pendingBookingCount === 1 ? "booking needs" : "bookings need"} confirmation`;
  const description = isCaughtUp
    ? "No bookings are waiting for confirmation."
    : "Please review pending customer bookings.";

  return (
    <View style={styles.card}>
      <Text style={styles.label}>PRIORITY</Text>
      <View style={styles.mainRow}>
        <View
          style={[
            styles.iconContainer,
            isCaughtUp && styles.successIconContainer,
          ]}
        >
          {isCaughtUp ? (
            <Ionicons
              color={colors.success}
              name="checkmark-circle-outline"
              size={28}
            />
          ) : (
            <Image
              fadeDuration={0}
              resizeMode="contain"
              source={bellIcon}
              style={styles.bellIcon}
            />
          )}
        </View>

        <View style={styles.content}>
          <Pressable
            accessibilityLabel={`${title}. ${description}`}
            accessibilityRole="button"
            hitSlop={4}
            onPress={onPress}
            style={({ pressed }) => [
              styles.titleRow,
              pressed && styles.pressed,
            ]}
          >
            <Text
              numberOfLines={2}
              style={[styles.title, compact && styles.compactTitle]}
            >
              {title}
            </Text>
            <Ionicons
              color={colors.textSecondary}
              name="chevron-forward"
              size={19}
            />
          </Pressable>

          <Text style={styles.description}>{description}</Text>

          {!isCaughtUp ? (
            <View style={styles.actionRow}>
              <Pressable
                accessibilityLabel="View bookings needing confirmation"
                accessibilityRole="button"
                onPress={onPress}
                style={({ pressed }) => [
                  styles.action,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.actionText}>View Bookings</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: "#E1E7EF",
    borderRadius: radii.xl,
    borderWidth: 1,
    minHeight: 140,
    paddingBottom: 21,
    paddingHorizontal: 20,
    paddingTop: 17,
    ...compactCardShadow,
  },
  label: {
    ...typography.cardEyebrow,
    color: colors.textSecondary,
  },
  mainRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: colors.pickupSoft,
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  successIconContainer: {
    backgroundColor: colors.receiptSoft,
  },
  bellIcon: {
    height: 72,
    width: 72,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
  },
  title: {
    ...typography.priorityTitle,
    color: colors.navy,
    flex: 1,
    flexShrink: 1,
  },
  compactTitle: {
    fontSize: 15,
  },
  description: {
    ...typography.priorityBody,
    color: colors.textSecondary,
    marginTop: 3,
  },
  actionRow: {
    alignItems: "flex-end",
    marginTop: 4,
  },
  action: {
    alignItems: "center",
    backgroundColor: "#F2F6FC",
    borderRadius: 13,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  actionText: {
    color: colors.actionBlue,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.68,
  },
});
