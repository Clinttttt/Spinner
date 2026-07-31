import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";

const headerWaves = require("../../../../assets/backgrounds/home-header-waves.webp");
const addTransactionMascot = require("../../../../assets/transactions/add-transaction-mascot.png");

interface TransactionFormHeaderProps {
  horizontalPadding: number;
  onBackPress: () => void;
  safeAreaTop: number;
  width: number;
}

export function TransactionFormHeader({
  horizontalPadding,
  onBackPress,
  safeAreaTop,
  width,
}: TransactionFormHeaderProps) {
  const compact = width <= 360;
  const mascotSize = compact ? 112 : 124;

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.backgroundClip}>
        <View
          style={[
            styles.backgroundFrame,
            { left: -(width + 28), width: width + 440 },
          ]}
        >
          <Image
            resizeMode="cover"
            source={headerWaves}
            style={styles.background}
          />
        </View>
      </View>
      <View
        style={[
          styles.titleRow,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: safeAreaTop + 12,
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Back to reports"
          accessibilityRole="button"
          onPress={onBackPress}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons color={colors.navy} name="chevron-back" size={25} />
        </Pressable>
        <View style={[styles.copy, { paddingRight: compact ? 94 : 108 }]}>
          <Text
            numberOfLines={1}
            style={[styles.title, compact && styles.compactTitle]}
          >
            Add Transaction
          </Text>
          <Text numberOfLines={2} style={styles.subtitle}>
            Record income or deductions.
          </Text>
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.mascotFrame,
            {
              bottom: -42,
              height: mascotSize,
              right: Math.max(horizontalPadding - 6, 4),
              width: mascotSize,
            },
          ]}
        >
          <Image
            accessibilityLabel="Spinly adding a transaction"
            resizeMode="contain"
            source={addTransactionMascot}
            style={styles.mascot}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  background: { height: "100%", opacity: 0.92, width: "100%" },
  backgroundClip: {
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  backgroundFrame: { height: 220, position: "absolute", top: -96 },
  compactTitle: { fontSize: 22, lineHeight: 28 },
  copy: { flex: 1, minWidth: 0 },
  mascot: { height: "100%", width: "100%" },
  mascotFrame: { position: "absolute" },
  pressed: { opacity: 0.7 },
  root: { paddingBottom: 18, position: "relative" },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  title: {
    color: colors.navy,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
});
