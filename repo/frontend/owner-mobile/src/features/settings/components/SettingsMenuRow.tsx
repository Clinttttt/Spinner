import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import type { SettingsMenuItem } from "../models/settings";

interface SettingsMenuRowProps {
  item: SettingsMenuItem;
  isLast: boolean;
  /**
   * True when the signed-in person may not open this.
   *
   * The row stays visible rather than being hidden, so staff can see what the shop has and
   * who to ask, instead of wondering whether a page they have heard of exists. It stays
   * pressable too, and explains itself when pressed — a dead row reads as a broken one.
   */
  locked?: boolean;
  onPress: () => void;
}

export function SettingsMenuRow({
  isLast,
  item,
  locked = false,
  onPress,
}: SettingsMenuRowProps) {
  return (
    <Pressable
      accessibilityHint={
        locked ? "Only the shop owner can open this" : undefined
      }
      accessibilityLabel={
        locked ? `${item.title}, owner only` : `Open ${item.title}`
      }
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconTile, locked && styles.lockedIconTile]}>
        <Ionicons
          color={locked ? colors.textMuted : colors.navy}
          name={item.icon}
          size={21}
        />
      </View>
      <View style={styles.copy}>
        <Text
          numberOfLines={1}
          style={[styles.title, locked && styles.lockedTitle]}
        >
          {item.title}
        </Text>
        <Text numberOfLines={2} style={styles.subtitle}>
          {locked ? "Owner only" : item.subtitle}
        </Text>
      </View>
      <Ionicons
        color={colors.textSecondary}
        name={locked ? "lock-closed" : "chevron-forward"}
        size={locked ? 16 : 19}
      />
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
  /** Quieter than an enabled row, without disappearing into the card. */
  lockedIconTile: { backgroundColor: colors.surfaceSoft },
  lockedTitle: { color: colors.textSecondary },
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
