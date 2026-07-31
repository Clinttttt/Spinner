import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/colors";
import { radii } from "../../theme/radii";
import { cardShadow } from "../../theme/shadows";
import { spacing } from "../../theme/spacing";

interface DashboardErrorStateProps {
  onRetry: () => void;
}

export function DashboardErrorState({ onRetry }: DashboardErrorStateProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Ionicons
          color={colors.danger}
          name="cloud-offline-outline"
          size={27}
        />
      </View>
      <Text style={styles.title}>We couldn’t load your dashboard.</Text>
      <Text style={styles.body}>
        Please check your connection and try again.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
      >
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginTop: spacing.xl,
    padding: spacing.lg,
    ...cardShadow,
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: "#FFF2F0",
    borderRadius: radii.md,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  retryButton: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    marginTop: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.76,
  },
});
