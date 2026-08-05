import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { HomeHeader } from "../../../components/home/HomeHeader";
import { appNotifications } from "../../notifications/components/NotificationsProvider";
import { colors } from "../../../theme/colors";

const headerWaves = require("../../../../assets/backgrounds/home-header-waves.webp");

interface ManualOrderPageHeaderProps {
  horizontalPadding: number;
  onBackPress: () => void;
  onProfilePress?: () => void;
  safeAreaTop: number;
  subtitle: string;
  title: string;
  width: number;
}

export function ManualOrderPageHeader({
  horizontalPadding,
  onBackPress,
  onProfilePress,
  safeAreaTop,
  subtitle,
  title,
  width,
}: ManualOrderPageHeaderProps) {
  const compact = width <= 390;

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
        style={{
          paddingHorizontal: horizontalPadding,
          paddingTop: safeAreaTop + 10,
        }}
      >
        <HomeHeader
          onNotificationsPress={appNotifications.open}
          onProfilePress={onProfilePress ?? (() => undefined)}
        />
        <View style={styles.titleRow}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={onBackPress}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color={colors.navy} name="chevron-back" size={25} />
          </Pressable>
          <View style={styles.copy}>
            <Text
              allowFontScaling={false}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1}
              numberOfLines={1}
              style={[styles.title, compact && styles.titleCompact]}
            >
              {title}
            </Text>
            <Text
              allowFontScaling={false}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1}
              numberOfLines={1}
              style={[styles.subtitle, compact && styles.subtitleCompact]}
            >
              {subtitle}
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
    height: 38,
    justifyContent: "center",
    width: 40,
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
  backgroundFrame: { height: 300, position: "absolute", top: -108 },
  copy: {
    flex: 1,
    flexBasis: 0,
    flexShrink: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  pressed: { opacity: 0.72 },
  root: { overflow: "hidden", paddingBottom: 18, position: "relative" },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 10.5,
    includeFontPadding: false,
    lineHeight: 14,
    marginTop: 3,
  },
  subtitleCompact: { fontSize: 9.5, lineHeight: 12 },
  title: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "700",
    includeFontPadding: false,
    lineHeight: 22,
  },
  titleCompact: { fontSize: 16, lineHeight: 20 },
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
