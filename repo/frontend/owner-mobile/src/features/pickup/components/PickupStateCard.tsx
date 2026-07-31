import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";

interface PickupStateCardProps {
  filtered?: boolean;
  kind: "empty" | "error";
  onAction: () => void;
}

export function PickupStateCard({
  filtered,
  kind,
  onAction,
}: PickupStateCardProps) {
  const error = kind === "error";
  const title = error
    ? "We couldn’t load pickup schedules."
    : filtered
      ? "No matching pickups"
      : "No pickups scheduled";
  const body = error
    ? "Please check your connection and try again."
    : filtered
      ? "Try a different search or clear your filters."
      : "Scheduled pickup jobs will appear here.";

  return (
    <View style={styles.card}>
      <View style={styles.iconTile}>
        <Ionicons
          color={error ? colors.danger : colors.navy}
          name={error ? "cloud-offline-outline" : "car-outline"}
          size={29}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {error || filtered ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>
            {error ? "Retry" : "Clear filters"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  iconTile: {
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
    marginTop: 12,
    textAlign: "center",
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
    backgroundColor: colors.navy,
    borderRadius: 11,
    height: 38,
    justifyContent: "center",
    marginTop: 15,
    paddingHorizontal: 16,
  },
  actionText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  pressed: { opacity: 0.72 },
});
