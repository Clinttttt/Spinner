import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import { compactCardShadow } from "../../../theme/shadows";

interface BookingDetailsStateCardProps {
  actionLabel: string;
  kind: "notFound" | "error";
  onActionPress: () => void;
}

export function BookingDetailsStateCard({
  actionLabel,
  kind,
  onActionPress,
}: BookingDetailsStateCardProps) {
  const notFound = kind === "notFound";

  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Ionicons
          color={notFound ? colors.navy : colors.danger}
          name={notFound ? "search-outline" : "cloud-offline-outline"}
          size={30}
        />
      </View>
      <Text style={styles.title}>
        {notFound ? "Booking not found" : "We couldn’t load this booking."}
      </Text>
      <Text style={styles.body}>
        {notFound
          ? "We couldn’t find the booking you’re looking for."
          : "Please try again."}
      </Text>
      <Pressable
        accessibilityLabel={actionLabel}
        accessibilityRole="button"
        onPress={onActionPress}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={styles.actionText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 24,
    paddingVertical: 32,
    ...compactCardShadow,
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: colors.pickupSoft,
    borderRadius: 17,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  title: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: 14,
    textAlign: "center",
  },
  body: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    textAlign: "center",
  },
  action: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    marginTop: 17,
    paddingHorizontal: 18,
  },
  actionText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.74,
  },
});
