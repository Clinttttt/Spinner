import { Image, StyleSheet, Text, View } from "react-native";

import { HomeHeader } from "../../../components/home/HomeHeader";
import { colors } from "../../../theme/colors";
import type { BookingStatusFilter } from "../models/booking";
import { BookingSearchBar } from "./BookingSearchBar";
import { BookingStatusFilters } from "./BookingStatusFilters";

const headerWaves = require("../../../../assets/backgrounds/home-header-waves.webp");

interface BookingsHeaderProps {
  compact: boolean;
  hasActiveFilters: boolean;
  onFilterPress: () => void;
  onNotificationsPress: () => void;
  onProfilePress: () => void;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: BookingStatusFilter) => void;
  pageHorizontalPadding: number;
  query: string;
  safeAreaTop: number;
  statusFilter: BookingStatusFilter;
  width: number;
}

export function BookingsHeader({
  compact,
  hasActiveFilters,
  onFilterPress,
  onNotificationsPress,
  onProfilePress,
  onQueryChange,
  onStatusChange,
  pageHorizontalPadding,
  query,
  safeAreaTop,
  statusFilter,
  width,
}: BookingsHeaderProps) {
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
      <View pointerEvents="none" style={styles.largeBubble}>
        <View style={styles.bubbleHighlight} />
      </View>
      <View pointerEvents="none" style={styles.smallBubble} />

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

        <View style={styles.headingGroup}>
          <Text style={[styles.title, compact && styles.compactTitle]}>
            Bookings
          </Text>
          <Text style={styles.subtitle}>
            Manage incoming and active laundry orders.
          </Text>
        </View>

        <View style={styles.searchGap}>
          <BookingSearchBar
            hasActiveFilters={hasActiveFilters}
            onChangeText={onQueryChange}
            onFilterPress={onFilterPress}
            value={query}
          />
        </View>

        <View style={styles.filtersGap}>
          <BookingStatusFilters
            onChange={onStatusChange}
            value={statusFilter}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 19,
    position: "relative",
  },
  backgroundFrame: {
    height: 360,
    position: "absolute",
    top: -105,
  },
  backgroundImage: {
    height: "100%",
    opacity: 0.92,
    width: "100%",
  },
  largeBubble: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(210,216,225,0.38)",
    borderRadius: 68,
    borderWidth: StyleSheet.hairlineWidth,
    height: 136,
    position: "absolute",
    right: -30,
    top: 112,
    width: 136,
  },
  bubbleHighlight: {
    backgroundColor: "rgba(255,255,255,0.32)",
    borderRadius: 10,
    height: 20,
    position: "absolute",
    right: 24,
    top: 18,
    width: 20,
  },
  smallBubble: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(210,216,225,0.32)",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    position: "absolute",
    right: 88,
    top: 148,
    width: 44,
  },
  headingGroup: {
    marginTop: 26,
  },
  title: {
    color: colors.navy,
    fontSize: 29,
    fontWeight: "700",
    lineHeight: 35,
  },
  compactTitle: {
    fontSize: 27,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    marginTop: 4,
  },
  searchGap: {
    marginTop: 18,
  },
  filtersGap: {
    marginTop: 15,
  },
});
