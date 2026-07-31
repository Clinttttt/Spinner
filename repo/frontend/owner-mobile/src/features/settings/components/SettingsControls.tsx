import Ionicons from "@expo/vector-icons/Ionicons";
import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { colors } from "../../../theme/colors";
import { radii } from "../../../theme/radii";
import { spacing } from "../../../theme/spacing";

interface SettingsSectionTitleProps {
  children: string;
  subtitle?: string;
}

export function SettingsSectionTitle({
  children,
  subtitle,
}: SettingsSectionTitleProps) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

interface PrimaryButtonProps {
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  loading?: boolean;
  onPress: () => void;
}

export function PrimaryButton({
  disabled,
  icon,
  label,
  loading = false,
  onPress,
}: PrimaryButtonProps) {
  const buttonDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: buttonDisabled }}
      disabled={buttonDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && styles.pressed,
        buttonDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.surface} size="small" />
      ) : icon ? (
        <Ionicons color={colors.surface} name={icon} size={19} />
      ) : null}
      <Text style={styles.primaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

interface ToggleRowProps {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  isLast?: boolean;
  onValueChange: (value: boolean) => void;
  title: string;
  value: boolean;
}

export function ToggleRow({
  description,
  icon,
  isLast,
  onValueChange,
  title,
  value,
}: ToggleRowProps) {
  return (
    <View style={[styles.toggleRow, !isLast && styles.divider]}>
      <View style={styles.toggleIcon}>
        <Ionicons color={colors.navy} name={icon} size={20} />
      </View>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        onValueChange={onValueChange}
        thumbColor={colors.surface}
        trackColor={{ false: "#D8DEE7", true: colors.navy }}
        value={value}
      />
    </View>
  );
}

export function InlineNotice({ children }: PropsWithChildren) {
  return (
    <View style={styles.notice}>
      <Ionicons
        color={colors.goldText}
        name="information-circle-outline"
        size={20}
      />
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.58 },
  divider: { borderBottomColor: colors.divider, borderBottomWidth: 1 },
  notice: {
    alignItems: "flex-start",
    backgroundColor: colors.surfaceGoldSoft,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: 10,
    padding: 13,
  },
  noticeText: {
    color: colors.neutralText,
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  pressed: { opacity: 0.78 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  primaryButtonLabel: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  sectionHeading: { gap: 3 },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  toggleCopy: { flex: 1, minWidth: 0 },
  toggleDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  toggleIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 11,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  toggleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  toggleTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
});
