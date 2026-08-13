import { memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useBusinessIdentity } from "../../features/settings/services/businessIdentityStore";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { HeaderAccountActions } from "../common/HeaderAccountActions";

const logo = require("../../../assets/branding/logo.jpg");

interface HomeHeaderProps {
  primaryAction?: "addTransaction" | "notifications";
  onNotificationsPress: () => void;
  onProfilePress: () => void;
}

function HomeHeaderComponent({
  primaryAction,
  onNotificationsPress,
  onProfilePress,
}: HomeHeaderProps) {
  const identity = useBusinessIdentity();

  /**
   * The shop's name, on the two lines this header was designed around.
   *
   * The name and the mark used to be written into the app, which made it one particular
   * laundromat's app. Both now come from the shop's settings.
   *
   * The last word becomes the second line, which is what turns "Engr. Spin Laundromat" into
   * "ENGR. SPIN" over "LAUNDROMAT" — the look this header already had — and still reads
   * sensibly for any other name. A single-word name simply occupies the first line.
   */
  const name = identity.businessName || "ENGR. SPIN LAUNDROMAT";
  const words = name.trim().split(/\s+/);
  const title = (
    words.length > 1 ? words.slice(0, -1).join(" ") : name
  ).toUpperCase();
  const subtitle =
    words.length > 1 ? words[words.length - 1].toUpperCase() : "";

  return (
    <View style={styles.header}>
      <View style={styles.brandGroup}>
        <Image
          accessibilityLabel={`${name} logo`}
          fadeDuration={0}
          resizeMode="cover"
          // The shop's own logo when it has set one, otherwise the mark shipped with the
          // app. A remote image that fails to load would leave a hole here, so the bundled
          // one remains the fallback rather than being removed.
          source={identity.logoUrl ? { uri: identity.logoUrl } : logo}
          style={styles.logo}
        />
        <View style={styles.brandText}>
          <Text numberOfLines={1} style={styles.brandTitle}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={styles.brandSubtitle}>
              {subtitle}
            </Text>
          ) : null}
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

// Two images and two icons that have nothing to do with the search box.
// Memoised so a keystroke in the search box does not redraw it.
export const HomeHeader = memo(HomeHeaderComponent);
