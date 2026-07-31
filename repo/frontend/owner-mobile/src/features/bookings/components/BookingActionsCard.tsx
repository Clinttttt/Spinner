import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import {
  bookingDetailsCardStyle,
  bookingDetailsColors,
} from "./bookingDetailsTheme";

interface BookingActionsCardProps {
  /** Shown only for finished orders that can be removed from the active list. */
  onClearPress?: () => void;
  onEditPress?: () => void;
  onMessagePress: () => void;
  onPrimaryPress: () => void;
  primaryDisabled?: boolean;
  primaryLabel: string;
  primaryLoading?: boolean;
}

interface ActionButtonProps {
  accessibilityLabel: string;
  disabled?: boolean;
  fullWidth?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  layoutWeight?: number;
  loading?: boolean;
  onPress: () => void;
  primary?: boolean;
}

function ActionButton({
  accessibilityLabel,
  disabled,
  fullWidth,
  icon,
  label,
  layoutWeight = 1,
  loading = false,
  onPress,
  primary,
}: ActionButtonProps) {
  const actionDisabled = disabled || loading;
  const foregroundColor = primary
    ? bookingDetailsColors.surface
    : bookingDetailsColors.textPrimary;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: actionDisabled }}
      disabled={actionDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { flex: layoutWeight },
        primary ? styles.primaryAction : styles.secondaryAction,
        fullWidth && styles.fullWidthAction,
        actionDisabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foregroundColor} size="small" />
      ) : (
        <Ionicons color={foregroundColor} name={icon} size={19} />
      )}
      <Text
        numberOfLines={1}
        style={[
          styles.actionText,
          primary ? styles.primaryText : styles.secondaryText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function BookingActionsCard({
  onClearPress,
  onEditPress,
  onMessagePress,
  onPrimaryPress,
  primaryDisabled,
  primaryLabel,
  primaryLoading,
}: BookingActionsCardProps) {
  const { width } = useWindowDimensions();
  const compact = width < 380;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Order Actions</Text>
      <View style={styles.actionsRow}>
        <ActionButton
          accessibilityLabel="Message customer"
          fullWidth={compact && !onEditPress}
          icon="chatbubble-ellipses-outline"
          label="Message"
          layoutWeight={0.82}
          onPress={onMessagePress}
        />
        {onEditPress ? (
          <ActionButton
            accessibilityLabel="Edit order"
            icon="create-outline"
            label="Edit Order"
            layoutWeight={1}
            onPress={onEditPress}
          />
        ) : null}
        <ActionButton
          accessibilityLabel={primaryLabel}
          disabled={primaryDisabled}
          fullWidth={compact}
          icon="checkbox-outline"
          label={primaryLabel}
          layoutWeight={1.45}
          loading={primaryLoading}
          onPress={onPrimaryPress}
          primary
        />
        {onClearPress ? (
          <ActionButton
            accessibilityLabel="Clear this order from the active list"
            fullWidth
            icon="trash-outline"
            label="Clear from list"
            onPress={onClearPress}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...bookingDetailsCardStyle,
    padding: 18,
  },
  title: {
    color: bookingDetailsColors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 13,
  },
  action: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    height: 46,
    justifyContent: "center",
    minWidth: 86,
    paddingHorizontal: 6,
  },
  secondaryAction: {
    backgroundColor: bookingDetailsColors.surface,
    borderColor: bookingDetailsColors.borderStrong,
  },
  primaryAction: {
    backgroundColor: bookingDetailsColors.primaryAction,
    borderColor: bookingDetailsColors.primaryAction,
  },
  fullWidthAction: {
    flexBasis: "100%",
    flexGrow: 0,
    flexShrink: 0,
    minWidth: "100%",
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  secondaryText: {
    color: bookingDetailsColors.textPrimary,
  },
  primaryText: {
    color: bookingDetailsColors.surface,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
});
