import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SkeletonPulse } from "../../../components/common/SkeletonPulse";
import { colors } from "../../../theme/colors";

export function TransactionSkeleton() {
  return (
    <SkeletonPulse
      accessibilityLabel="Loading transactions"
      style={styles.skeletonCard}
    >
      {[0, 1, 2, 3].map((item) => (
        <View key={item} style={styles.skeletonRow}>
          <View style={[styles.skeleton, styles.skeletonIcon]} />
          <View style={styles.skeletonCopy}>
            <View style={[styles.skeleton, styles.skeletonTitle]} />
            <View style={[styles.skeleton, styles.skeletonDetail]} />
          </View>
          <View style={[styles.skeleton, styles.skeletonAmount]} />
        </View>
      ))}
    </SkeletonPulse>
  );
}

interface TransactionStateCardProps {
  kind: "empty" | "error" | "searchEmpty";
  onRetry?: () => void;
}

const copy = {
  empty: {
    body: "Recorded income, deductions, and completed sales will appear here.",
    icon: "receipt-outline" as const,
    title: "No transactions yet",
  },
  error: {
    body: "Please check your connection and try again.",
    icon: "cloud-offline-outline" as const,
    title: "We couldn’t load transaction history.",
  },
  searchEmpty: {
    body: "Try another note, type, or amount.",
    icon: "search-outline" as const,
    title: "No matching transactions",
  },
};

export function TransactionStateCard({
  kind,
  onRetry,
}: TransactionStateCardProps) {
  const state = copy[kind];
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIcon}>
        <Ionicons color={colors.navy} name={state.icon} size={28} />
      </View>
      <Text style={styles.stateTitle}>{state.title}</Text>
      <Text style={styles.stateBody}>{state.body}</Text>
      {kind === "error" && onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  retryButton: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 24,
  },
  retryText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  skeleton: { backgroundColor: "#EEF2F6", borderRadius: 8 },
  skeletonAmount: { height: 18, width: 70 },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  skeletonCopy: { flex: 1, gap: 7 },
  skeletonDetail: { height: 12, width: "70%" },
  skeletonIcon: { borderRadius: 22, height: 44, width: 44 },
  skeletonRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    height: 72,
  },
  skeletonTitle: { height: 15, width: "45%" },
  stateBody: {
    color: colors.textSecondary,
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 7,
    maxWidth: 280,
    textAlign: "center",
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 28,
  },
  stateIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    marginBottom: 14,
    width: 48,
  },
  stateTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
});
