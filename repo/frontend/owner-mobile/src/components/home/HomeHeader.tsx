import { Image, StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { HeaderAccountActions } from "../common/HeaderAccountActions";

const logo = require("../../../assets/branding/logo.jpg");

interface HomeHeaderProps {
  primaryAction?: "addTransaction" | "notifications";
  onNotificationsPress: () => void;
  onProfilePress: () => void;
}

export function HomeHeader({
  primaryAction,
  onNotificationsPress,
  onProfilePress,
}: HomeHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.brandGroup}>
        <Image
          accessibilityLabel="Engr. Spin Laundromat logo"
          resizeMode="cover"
          source={logo}
          style={styles.logo}
        />
        <View style={styles.brandText}>
          <Text numberOfLines={1} style={styles.brandTitle}>
            ENGR. SPIN
          </Text>
          <Text numberOfLines={1} style={styles.brandSubtitle}>
            LAUNDROMAT
          </Text>
        </View>
      </View>

      <HeaderAccountActions
        primaryAction={primaryAction}
        onNotificationsPress={onNotificationsPress}
        onProfilePress={onProfilePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
  },
  brandGroup: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 0,
  },
  logo: {
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  brandSubtitle: {
    color: "#B36F00",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 3,
    lineHeight: 14,
  },
});
