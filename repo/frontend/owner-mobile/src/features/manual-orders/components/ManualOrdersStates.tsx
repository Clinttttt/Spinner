import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";

export function ManualOrdersSkeleton() {
  return (
    <View style={styles.stack}>
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.skeleton} />
      ))}
    </View>
  );
}

export function ManualOrdersState({
  kind,
  onAction,
}: {
  kind: "empty" | "search" | "error";
  onAction: () => void;
}) {
  const copy = {
    empty: {
      icon: "receipt-outline" as const,
      title: "No manual orders yet",
      body: "Create an order for a walk-in, drop-off, or assisted customer.",
      action: "+ Create Order",
    },
    search: {
      icon: "search-outline" as const,
      title: "No matching orders",
      body: "Try another name, order ID, or phone number.",
      action: "Clear Search",
    },
    error: {
      icon: "cloud-offline-outline" as const,
      title: "We couldn’t load manual orders.",
      body: "Please check your connection and try again.",
      action: "Retry",
    },
  }[kind];
  return (
    <View style={styles.stateCard}>
      <View style={styles.icon}>
        <Ionicons color={colors.navy} name={copy.icon} size={27} />
      </View>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onAction}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{copy.action}</Text>
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
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 15,
    minHeight: 44,
    paddingHorizontal: 18,
  },
  buttonText: { color: colors.surface, fontSize: 13, fontWeight: "700" },
  icon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  skeleton: {
    backgroundColor: colors.neutralSoft,
    borderRadius: 20,
    height: 184,
  },
  stack: { gap: 12 },
  stateCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  title: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 12,
    textAlign: "center",
  },
});
