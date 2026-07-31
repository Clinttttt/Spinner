import { Image, StyleSheet, Text, View } from "react-native";

import { HomeHeader } from "../../../components/home/HomeHeader";
import { colors } from "../../../theme/colors";
import type { PickupFilter } from "../models/pickup";
import { PickupFilterTabs } from "./PickupFilterTabs";
import { PickupSearchBar } from "./PickupSearchBar";

const headerWaves = require("../../../../assets/backgrounds/home-header-waves.webp");

interface PickupHeaderProps {
  compact: boolean;
  filter: PickupFilter;
  onFilterChange: (value: PickupFilter) => void;
  onFilterPress: () => void;
  onNotificationsPress: () => void;
  onProfilePress: () => void;
  onQueryChange: (value: string) => void;
  pageHorizontalPadding: number;
  query: string;
  safeAreaTop: number;
  width: number;
}

export function PickupHeader(props: PickupHeaderProps) {
  return (
    <View style={styles.container}>
      <View
        pointerEvents="none"
        style={[
          styles.backgroundFrame,
          { left: -(props.width + 28), width: props.width + 440 },
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
          paddingHorizontal: props.pageHorizontalPadding,
          paddingTop: props.safeAreaTop + 12,
        }}
      >
        <HomeHeader
          onNotificationsPress={props.onNotificationsPress}
          onProfilePress={props.onProfilePress}
        />
        <View style={styles.headingGroup}>
          <Text style={[styles.title, props.compact && styles.compactTitle]}>
            Pickup
          </Text>
          <Text style={styles.subtitle}>
            Manage scheduled pickups and field progress.
          </Text>
        </View>
        <View style={styles.searchGap}>
          <PickupSearchBar
            onChangeText={props.onQueryChange}
            onFilterPress={props.onFilterPress}
            value={props.query}
          />
        </View>
        <View style={styles.filtersGap}>
          <PickupFilterTabs
            onChange={props.onFilterChange}
            value={props.filter}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 14, position: "relative" },
  backgroundFrame: { height: 390, position: "absolute", top: -105 },
  backgroundImage: { height: "100%", opacity: 0.92, width: "100%" },
  largeBubble: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(210,216,225,0.34)",
    borderRadius: 66,
    borderWidth: StyleSheet.hairlineWidth,
    height: 132,
    position: "absolute",
    right: -34,
    top: 116,
    width: 132,
  },
  headingGroup: { marginTop: 25 },
  title: {
    color: colors.navy,
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36,
  },
  compactTitle: { fontSize: 28, lineHeight: 34 },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  searchGap: { marginTop: 17 },
  filtersGap: { marginTop: 14 },
});
