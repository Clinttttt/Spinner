import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";

interface BookingsEmptyStateProps {
  filtered: boolean;
  onClearFilters: () => void;
}

export function BookingsEmptyState({
  filtered,
  onClearFilters,
}: BookingsEmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons color={colors.navy} name="calendar-outline" size={28} />
      </View>
      <Text style={styles.title}>
        {filtered ? "No matching bookings" : "No bookings yet"}
      </Text>
      <Text style={styles.body}>
        {filtered
          ? "Try a different search or clear your filters."
          : "New customer bookings will appear here."}
      </Text>
      {filtered ? (
        <Pressable
          accessibilityLabel="Clear booking search and filters"
          accessibilityRole="button"
          onPress={onClearFilters}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>Clear filters</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: colors.pickupSoft,
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  title: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 13,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    textAlign: "center",
  },
  action: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 11,
    height: 36,
    justifyContent: "center",
    marginTop: 15,
    paddingHorizontal: 14,
  },
  actionText: {
    color: colors.actionBlue,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.68,
  },
});
