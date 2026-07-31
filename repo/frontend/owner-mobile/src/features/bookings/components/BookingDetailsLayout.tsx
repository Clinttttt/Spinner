import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../../theme/colors";
import { BookingDetailsHeader } from "./BookingDetailsHeader";
import { bookingDetailsColors } from "./bookingDetailsTheme";

const headerWaves = require("../../../../assets/backgrounds/home-header-waves.webp");

interface BookingDetailsLayoutProps {
  bookingCode?: string;
  children: ReactNode;
  onBackPress: () => void;
  onProfilePress: () => void;
  title?: string;
}

export function BookingDetailsLayout({
  bookingCode,
  children,
  onBackPress,
  onProfilePress,
  title = "Booking Details",
}: BookingDetailsLayoutProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pageHorizontalPadding = width <= 360 ? 12 : 14;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topVisualSection}>
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
          <View pointerEvents="none" style={styles.largeBubble}>
            <View style={styles.bubbleHighlight} />
          </View>

          <View
            style={[
              styles.headerContent,
              {
                paddingHorizontal: pageHorizontalPadding,
                paddingTop: insets.top + 12,
              },
            ]}
          >
            <BookingDetailsHeader
              bookingCode={bookingCode}
              onBackPress={onBackPress}
              onNotificationsPress={() => undefined}
              onProfilePress={onProfilePress}
              title={title}
            />
          </View>
        </View>

        <View
          style={[styles.content, { paddingHorizontal: pageHorizontalPadding }]}
        >
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

export function BookingDetailsSupportRow() {
  return (
    <View style={styles.supportRow}>
      <Ionicons
        color={bookingDetailsColors.textSecondary}
        name="help-circle-outline"
        size={17}
      />
      <Text style={styles.supportText}>Need help with this order? </Text>
      <Pressable
        accessibilityLabel="Contact support"
        accessibilityRole="button"
        onPress={() => undefined}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Text style={styles.supportLink}>Contact support</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundFrame: {
    height: 220,
    position: "absolute",
    top: -105,
  },
  backgroundImage: {
    height: "100%",
    opacity: 0.92,
    width: "100%",
  },
  bubbleHighlight: {
    backgroundColor: "rgba(255,255,255,0.32)",
    borderRadius: 8,
    height: 16,
    position: "absolute",
    right: 19,
    top: 15,
    width: 16,
  },
  content: { gap: 14 },
  headerContent: { paddingBottom: 34 },
  largeBubble: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(210,216,225,0.36)",
    borderRadius: 52,
    borderWidth: StyleSheet.hairlineWidth,
    height: 104,
    position: "absolute",
    right: -24,
    top: 54,
    width: 104,
  },
  pressed: { opacity: 0.62 },
  screen: { backgroundColor: colors.background, flex: 1 },
  scrollContent: { paddingBottom: 16 },
  supportLink: {
    color: bookingDetailsColors.activeBlue,
    fontSize: 12.5,
    fontWeight: "500",
    lineHeight: 17,
  },
  supportRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 2,
    marginTop: 4,
    minHeight: 44,
  },
  supportText: {
    color: bookingDetailsColors.textSecondary,
    fontSize: 12.5,
    lineHeight: 17,
  },
  topVisualSection: { position: "relative" },
});
