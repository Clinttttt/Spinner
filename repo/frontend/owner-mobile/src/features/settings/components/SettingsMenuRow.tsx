import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import type { SettingsMenuItem } from "../models/settings";

interface SettingsMenuRowProps {
  item: SettingsMenuItem;
  isLast: boolean;
  onPress: () => void;
}

export function SettingsMenuRow({
  isLast,
  item,
  onPress,
}: SettingsMenuRowProps) {
  return (
    <Pressable
      accessibilityLabel={`Open ${item.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconTile}>
        <Ionicons color={colors.navy} name={item.icon} size={21} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.title}>
          {item.title}
        </Text>
        <Text numberOfLines={2} style={styles.subtitle}>
          {item.subtitle}
        </Text>
      </View>
      <Ionicons color={colors.textSecondary} name="chevron-forward" size={19} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1, minWidth: 0 },
  divider: { borderBottomColor: colors.divider, borderBottomWidth: 1 },
  iconTile: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 11,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  pressed: { backgroundColor: colors.surfaceSoft },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 70,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  title: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
});
