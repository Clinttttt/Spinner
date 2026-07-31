import { Image, StyleSheet, Text, View } from "react-native";

import { HomeHeader } from "../../../components/home/HomeHeader";
import { colors } from "../../../theme/colors";
import type { TransactionFilter } from "../models/transaction";
import { TransactionFilterTabs } from "./TransactionFilterTabs";
import { TransactionSearchBar } from "./TransactionSearchBar";

const headerWaves = require("../../../../assets/backgrounds/home-header-waves.webp");

interface TransactionHistoryHeaderProps {
  compact: boolean;
  filter: TransactionFilter;
  onFilterChange: (value: TransactionFilter) => void;
  onFilterPress: () => void;
  onNotificationsPress: () => void;
  onProfilePress: () => void;
  onQueryChange: (value: string) => void;
  pageHorizontalPadding: number;
  query: string;
  safeAreaTop: number;
  width: number;
}

export function TransactionHistoryHeader(props: TransactionHistoryHeaderProps) {
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
            Transaction History
          </Text>
          <Text style={styles.subtitle}>
            Review all recorded income and deductions.
          </Text>
        </View>
        <View style={styles.searchGap}>
          <TransactionSearchBar
            onChangeText={props.onQueryChange}
            onFilterPress={props.onFilterPress}
            value={props.query}
          />
        </View>
        <View style={styles.filtersGap}>
          <TransactionFilterTabs
            onChange={props.onFilterChange}
            value={props.filter}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundFrame: { height: 390, position: "absolute", top: -105 },
  backgroundImage: { height: "100%", opacity: 0.92, width: "100%" },
  compactTitle: { fontSize: 26, lineHeight: 32 },
  container: { overflow: "hidden", paddingBottom: 15, position: "relative" },
  filtersGap: { marginTop: 14 },
  headingGroup: { marginTop: 25 },
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
  searchGap: { marginTop: 17 },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  title: {
    color: colors.navy,
    fontSize: 29,
    fontWeight: "700",
    lineHeight: 35,
  },
});
