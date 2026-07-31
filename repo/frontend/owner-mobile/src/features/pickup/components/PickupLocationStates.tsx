import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";

function SkeletonBlock({ height }: { height: number }) {
  return <View style={[styles.skeletonBlock, { height }]} />;
}

export function PickupLocationSkeleton() {
  return (
    <View accessibilityLabel="Loading pickup location" style={styles.skeleton}>
      <SkeletonBlock height={116} />
      <SkeletonBlock height={280} />
      <SkeletonBlock height={250} />
    </View>
  );
}

interface PickupLocationStateProps {
  kind: "error" | "empty";
  onBack: () => void;
  onRetry?: () => void;
}

export function PickupLocationState({
  kind,
  onBack,
  onRetry,
}: PickupLocationStateProps) {
  const error = kind === "error";
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIcon}>
        <Ionicons
          color={colors.navy}
          name={error ? "cloud-offline-outline" : "location-outline"}
          size={29}
        />
      </View>
      <Text style={styles.stateTitle}>
        {error
          ? "We couldn’t load this pickup location."
          : "Pickup location is not available"}
      </Text>
      <Text style={styles.stateBody}>
        {error
          ? "Please check your connection and try again."
          : "Contact the customer or review the booking address."}
      </Text>
      {error && onRetry ? (
        <Pressable
          accessibilityLabel="Retry pickup location"
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityLabel="Back to Pickup"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
      >
        <Text style={styles.backLinkText}>Back to Pickup</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    marginTop: 4,
  },
  backLinkText: { color: colors.navy, fontSize: 13, fontWeight: "600" },
  pressed: { opacity: 0.72 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 13,
    height: 48,
    justifyContent: "center",
    marginTop: 20,
    width: "100%",
  },
  primaryButtonText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  skeleton: { gap: 13 },
  skeletonBlock: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stateBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    textAlign: "center",
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
  },
  stateIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  stateTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: 15,
    textAlign: "center",
  },
});
