import { Image, StyleSheet, Text, View } from "react-native";

import { HomeHeader } from "../../../components/home/HomeHeader";
import { colors } from "../../../theme/colors";

const headerWaves = require("../../../../assets/backgrounds/home-header-waves.webp");
const reportMascot = require("../../../../assets/reports/report-mascot.png");

interface ReportsHeaderAreaProps {
  compact: boolean;
  onAddTransactionPress: () => void;
  onProfilePress: () => void;
  pageHorizontalPadding: number;
  safeAreaTop: number;
  width: number;
}

export function ReportsHeaderArea({
  compact,
  onAddTransactionPress,
  onProfilePress,
  pageHorizontalPadding,
  safeAreaTop,
  width,
}: ReportsHeaderAreaProps) {
  const mascotSize = compact ? 112 : 142;

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
          resizeMode="cover"
          source={headerWaves}
          style={styles.backgroundImage}
        />
      </View>
      <View pointerEvents="none" style={styles.largeBubble} />

      <View
        style={{
          paddingHorizontal: pageHorizontalPadding,
          paddingTop: safeAreaTop + 12,
        }}
      >
        <HomeHeader
          primaryAction="addTransaction"
          onNotificationsPress={onAddTransactionPress}
          onProfilePress={onProfilePress}
        />

        <View style={[styles.hero, compact && styles.compactHero]}>
          <View style={styles.headingGroup}>
            <Text style={[styles.title, compact && styles.compactTitle]}>
              Insights
            </Text>
            <Text style={styles.subtitle}>
              Track performance and grow your business.
            </Text>
          </View>
          <View
            style={[
              styles.mascotFrame,
              {
                bottom: -24,
                height: mascotSize,
                right: 0,
                width: mascotSize,
              },
            ]}
          >
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel="Spinly holding a business report"
              resizeMode="contain"
              source={reportMascot}
              style={styles.mascot}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundFrame: { height: 330, position: "absolute", top: -105 },
  backgroundImage: { height: "100%", opacity: 0.92, width: "100%" },
  compactHero: { minHeight: 106 },
  compactTitle: { fontSize: 27, lineHeight: 33 },
  container: { overflow: "hidden", position: "relative" },
  headingGroup: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 14,
    paddingRight: 122,
    paddingTop: 18,
  },
  hero: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 118,
    position: "relative",
  },
  largeBubble: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(210,216,225,0.34)",
    borderRadius: 66,
    borderWidth: StyleSheet.hairlineWidth,
    height: 132,
    position: "absolute",
    right: -34,
    top: 118,
    width: 132,
  },
  mascot: { height: "100%", width: "100%" },
  mascotFrame: { position: "absolute" },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 205,
  },
  title: {
    color: colors.navy,
    fontSize: 29,
    fontWeight: "700",
    lineHeight: 35,
  },
});
