import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, StyleSheet, Text, View } from "react-native";

import { IconButton } from "../../../components/common/IconButton";
import { HomeHeader } from "../../../components/home/HomeHeader";
import { colors } from "../../../theme/colors";

const headerWaves = require("../../../../assets/backgrounds/home-header-waves.webp");

interface SettingsOverviewHeaderProps {
  compact: boolean;
  horizontalPadding: number;
  onNotificationsPress: () => void;
  onProfilePress: () => void;
  safeAreaTop: number;
}

export function SettingsOverviewHeader({
  compact,
  horizontalPadding,
  onNotificationsPress,
  onProfilePress,
  safeAreaTop,
}: SettingsOverviewHeaderProps) {
  return (
    <View style={styles.overviewContainer}>
      <View pointerEvents="none" style={styles.backgroundFrame}>
        <Image
          resizeMode="cover"
          source={headerWaves}
          style={styles.backgroundImage}
        />
      </View>
      <View
        style={{
          paddingHorizontal: horizontalPadding,
          paddingTop: safeAreaTop + 12,
        }}
      >
        <HomeHeader
          onNotificationsPress={onNotificationsPress}
          onProfilePress={onProfilePress}
        />
        <View
          style={[styles.overviewHeading, compact && styles.compactHeading]}
        >
          <Text style={[styles.overviewTitle, compact && styles.compactTitle]}>
            Settings
          </Text>
          <Text style={styles.overviewSubtitle}>
            Manage your account, business, and app preferences.
          </Text>
        </View>
      </View>
    </View>
  );
}

interface SettingsPageHeaderProps {
  horizontalPadding: number;
  onBackPress: () => void;
  safeAreaTop: number;
  subtitle?: string;
  title: string;
}

export function SettingsPageHeader({
  horizontalPadding,
  onBackPress,
  safeAreaTop,
  subtitle,
  title,
}: SettingsPageHeaderProps) {
  return (
    <View style={styles.pageHeaderContainer}>
      <View pointerEvents="none" style={styles.pageBackgroundFrame}>
        <Image
          resizeMode="cover"
          source={headerWaves}
          style={styles.backgroundImage}
        />
      </View>
      <View
        style={[
          styles.pageHeader,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: safeAreaTop + 10,
          },
        ]}
      >
        <IconButton accessibilityLabel="Back to settings" onPress={onBackPress}>
          <Ionicons color={colors.navy} name="chevron-back" size={27} />
        </IconButton>
        <View style={styles.pageHeadingCopy}>
          <Text numberOfLines={1} style={styles.pageTitle}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={styles.pageSubtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.settingsMark}>
          <Ionicons color={colors.navy} name="settings-outline" size={22} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundFrame: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  backgroundImage: { height: "100%", opacity: 0.9, width: "100%" },
  compactHeading: { paddingBottom: 17, paddingTop: 21 },
  compactTitle: { fontSize: 27, lineHeight: 33 },
  overviewContainer: { overflow: "hidden", position: "relative" },
  overviewHeading: { paddingBottom: 22, paddingTop: 25 },
  overviewSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  overviewTitle: {
    color: colors.navy,
    fontSize: 29,
    fontWeight: "700",
    lineHeight: 35,
  },
  pageBackgroundFrame: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  pageHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 86,
    paddingBottom: 14,
  },
  pageHeaderContainer: { overflow: "hidden", position: "relative" },
  pageHeadingCopy: { flex: 1, minWidth: 0 },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 1,
  },
  pageTitle: {
    color: colors.navy,
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 24,
  },
  settingsMark: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
});
