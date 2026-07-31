import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "../../theme/colors";
import { radii } from "../../theme/radii";
import { controlShadow } from "../../theme/shadows";

interface IconButtonProps {
  accessibilityLabel: string;
  children: ReactNode;
  onPress?: () => void;
  showUnreadDot?: boolean;
  size?: number;
}

export function IconButton({
  accessibilityLabel,
  children,
  onPress,
  showUnreadDot = false,
  size = 44,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.control,
        { height: size, width: size },
        pressed && styles.pressed,
      ]}
    >
      {children}
      {showUnreadDot ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.90)",
    borderColor: "rgba(232,236,241,0.9)",
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    ...controlShadow,
  },
  pressed: {
    opacity: 0.72,
  },
  unreadDot: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    height: 6,
    position: "absolute",
    right: 3,
    top: 3,
    width: 6,
  },
});
