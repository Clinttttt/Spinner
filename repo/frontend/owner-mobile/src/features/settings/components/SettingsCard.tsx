import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { colors } from "../../../theme/colors";
import { radii } from "../../../theme/radii";
import { cardShadow } from "../../../theme/shadows";

interface SettingsCardProps extends PropsWithChildren {
  style?: ViewStyle;
}

export function SettingsCard({ children, style }: SettingsCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    ...cardShadow,
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
});
