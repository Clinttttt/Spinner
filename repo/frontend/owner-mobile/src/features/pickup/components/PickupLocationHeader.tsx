import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { HomeHeader } from "../../../components/home/HomeHeader";
import { colors } from "../../../theme/colors";

const headerWaves = require("../../../../assets/backgrounds/home-header-waves.webp");

interface PickupLocationHeaderProps {
  compact: boolean;
  onBackPress: () => void;
  onNotificationsPress: () => void;
  onProfilePress: () => void;
  pageHorizontalPadding: number;
  safeAreaTop: number;
  width: number;
}

export function PickupLocationHeader({
  compact,
  onBackPress,
  onNotificationsPress,
  onProfilePress,
  pageHorizontalPadding,
  safeAreaTop,
  width,
}: PickupLocationHeaderProps) {
  return (
    <View style={styles.container}>
      <View
        pointerEvents="none"
        style={[
          styles.backgroundFrame,
          { left: -(width + 28), width: width + 440 },
        ]}
      >
        <Image
          fadeDuration={0}
          resizeMode="cover"
          source={headerWaves}
          style={styles.background}
        />
      </View>
      <View
        style={{
          paddingHorizontal: pageHorizontalPadding,
          paddingTop: safeAreaTop + 12,
        }}
      >
        <HomeHeader
          onNotificationsPress={onNotificationsPress}
          onProfilePress={onProfilePress}
        />
        <View style={styles.titleRow}>
          <Pressable
            accessibilityLabel="Back to Pickup"
            accessibilityRole="button"
            hitSlop={4}
            onPress={onBackPress}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color={colors.navy} name="chevron-back" size={28} />
          </Pressable>
          <View style={styles.titleCopy}>
            <Text
              allowFontScaling={false}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1}
              numberOfLines={1}
              style={[styles.title, compact && styles.compactTitle]}
            >
              Pickup Location
            </Text>
            <Text
              allowFontScaling={false}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1}
              numberOfLines={1}
              style={[styles.subtitle, compact && styles.compactSubtitle]}
            >
              Navigate to the customer pickup point.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: colors.border,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  background: { height: "100%", opacity: 0.92, width: "100%" },
  backgroundFrame: { height: 290, position: "absolute", top: -100 },
  compactSubtitle: { fontSize: 9.5, lineHeight: 12 },
  compactTitle: { fontSize: 16, lineHeight: 20 },
  container: { overflow: "hidden", paddingBottom: 21, position: "relative" },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  subtitle: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: 10.5,
    includeFontPadding: false,
    lineHeight: 14,
    marginTop: 3,
  },
  title: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "700",
    includeFontPadding: false,
    lineHeight: 22,
  },
  titleCopy: {
    flex: 1,
    flexBasis: 0,
    flexShrink: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    minWidth: 0,
    paddingRight: 4,
    width: "100%",
  },
});
