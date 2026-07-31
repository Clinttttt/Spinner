import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../theme/colors";
import { radii } from "../../theme/radii";
import { spacing } from "../../theme/spacing";

export type DialogTone = "info" | "danger" | "success" | "warning";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export interface AppDialogProps {
  /** Extra lines rendered under the message, e.g. an order summary. */
  bullets?: string[];
  busy?: boolean;
  cancelLabel?: string;
  confirmLabel: string;
  message: string;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  tone?: DialogTone;
}

const toneStyles: Record<
  DialogTone,
  { accent: string; background: string; icon: IoniconName }
> = {
  danger: {
    accent: colors.danger,
    background: colors.redSoft,
    icon: "alert-circle-outline",
  },
  info: {
    accent: colors.navy,
    background: colors.blueSoft,
    icon: "information-circle-outline",
  },
  success: {
    accent: colors.success,
    background: colors.greenSoft,
    icon: "checkmark-circle-outline",
  },
  warning: {
    accent: colors.goldText,
    background: colors.surfaceGoldSoft,
    icon: "warning-outline",
  },
};

/**
 * The single confirmation/notice surface for the owner app.
 *
 * Native `Alert.alert` renders the platform's grey system dialog, which looks
 * unrelated to the rest of the product. This sheet reuses the app's card
 * styling so every confirmation reads as part of Spinner.
 */
export function AppDialog({
  bullets,
  busy = false,
  cancelLabel,
  confirmLabel,
  message,
  onCancel,
  onConfirm,
  title,
  tone = "info",
}: AppDialogProps) {
  const insets = useSafeAreaInsets();
  const palette = toneStyles[tone];
  const dismissible = Boolean(cancelLabel && onCancel) && !busy;

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (dismissible) onCancel?.();
      }}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible
    >
      <View style={styles.root}>
        <Pressable
          accessibilityElementsHidden={!dismissible}
          accessibilityLabel="Dismiss dialog"
          accessibilityRole="button"
          disabled={!dismissible}
          importantForAccessibility={
            dismissible ? "yes" : "no-hide-descendants"
          }
          onPress={() => onCancel?.()}
          style={styles.backdrop}
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}
        >
          <View style={styles.handle} />
          <View style={[styles.icon, { backgroundColor: palette.background }]}>
            <Ionicons color={palette.accent} name={palette.icon} size={26} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            style={styles.messageArea}
          >
            <Text style={styles.body}>{message}</Text>
            {bullets?.length ? (
              <View style={styles.bullets}>
                {bullets.map((bullet) => (
                  <View key={bullet} style={styles.bulletRow}>
                    <View
                      style={[
                        styles.bulletDot,
                        { backgroundColor: palette.accent },
                      ]}
                    />
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
          <View style={styles.actions}>
            {cancelLabel && onCancel ? (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={onCancel}
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  pressed && styles.pressed,
                  busy && styles.disabled,
                ]}
              >
                <Text style={styles.secondaryLabel}>{cancelLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor:
                    tone === "danger" ? colors.danger : colors.navy,
                },
                pressed && styles.pressed,
                busy && styles.disabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Text style={styles.primaryLabel}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: spacing.sm - 2,
    marginTop: spacing.lg,
  },
  backdrop: {
    backgroundColor: "rgba(8,35,71,0.32)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  bulletDot: {
    borderRadius: 3,
    height: 6,
    marginTop: 7,
    width: 6,
  },
  bulletRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  bulletText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  bullets: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  button: {
    alignItems: "center",
    borderRadius: radii.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacing.sm,
  },
  disabled: { opacity: 0.6 },
  handle: {
    alignSelf: "center",
    backgroundColor: "#D0D5DD",
    borderRadius: 2,
    height: 4,
    width: 38,
  },
  icon: {
    alignItems: "center",
    borderRadius: radii.lg,
    height: 52,
    justifyContent: "center",
    marginTop: spacing.md,
    width: 52,
  },
  messageArea: { maxHeight: 260 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  primaryLabel: {
    color: colors.surface,
    fontSize: 14.5,
    fontWeight: "700",
  },
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  secondaryLabel: {
    color: colors.navy,
    fontSize: 14.5,
    fontWeight: "600",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl + 4,
    borderTopRightRadius: radii.xl + 4,
    paddingHorizontal: spacing.lg - 2,
    paddingTop: spacing.sm - 2,
  },
  title: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    marginTop: spacing.sm,
  },
});
