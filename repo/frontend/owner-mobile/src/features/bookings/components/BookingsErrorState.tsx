import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";

interface BookingsErrorStateProps {
  onRetry: () => void;
}

export function BookingsErrorState({ onRetry }: BookingsErrorStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons color={colors.danger} name="cloud-offline-outline" size={30} />
      <Text style={styles.title}>We couldn’t load your bookings.</Text>
      <Text style={styles.body}>
        Please check your connection and try again.
      </Text>
      <Pressable
        accessibilityLabel="Retry loading bookings"
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={styles.actionText}>Retry</Text>
      </Pressable>
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
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  title: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 11,
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
  pressed: {
    opacity: 0.74,
  },
});
