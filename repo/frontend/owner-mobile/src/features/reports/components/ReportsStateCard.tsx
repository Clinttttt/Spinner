import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";

interface ReportsStateCardProps {
  kind: "empty" | "error";
  onAction: () => void;
}

export function ReportsStateCard({ kind, onAction }: ReportsStateCardProps) {
  const error = kind === "error";
  return (
    <View style={styles.card}>
      <View style={styles.iconTile}>
        <Ionicons
          color={colors.actionBlue}
          name={error ? "cloud-offline-outline" : "analytics-outline"}
          size={28}
        />
      </View>
      <Text style={styles.title}>
        {error ? "We couldn’t load your reports." : "No report data available"}
      </Text>
      <Text style={styles.body}>
        {error
          ? "Please check your connection and try again."
          : "Try selecting a different date range or filter."}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onAction}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>
          {error ? "Retry" : "Reset filters"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    textAlign: "center",
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    marginTop: 16,
    minWidth: 132,
    paddingHorizontal: 18,
  },
  buttonText: { color: colors.surface, fontSize: 13, fontWeight: "600" },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 28,
  },
  iconTile: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 18,
    height: 56,
    justifyContent: "center",
    marginBottom: 14,
    width: 56,
  },
  pressed: { opacity: 0.72 },
  title: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "center",
  },
});
