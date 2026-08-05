import Ionicons from "@expo/vector-icons/Ionicons";
import { memo } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { HomeHeader } from "../../../components/home/HomeHeader";
import { colors } from "../../../theme/colors";
import type { OrderHistoryFilter } from "../models/orderHistory";

const headerWaves = require("../../../../assets/backgrounds/home-header-waves.webp");

const filterOptions: { label: string; value: OrderHistoryFilter }[] = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Unpaid", value: "unpaid" },
];

interface OrderHistoryHeaderProps {
  compact: boolean;
  filter: OrderHistoryFilter;
  horizontalPadding: number;
  onBackPress: () => void;
  onFilterChange: (value: OrderHistoryFilter) => void;
  onNotificationsPress: () => void;
  onProfilePress: () => void;
  onQueryChange: (value: string) => void;
  query: string;
  safeAreaTop: number;
  width: number;
}

function OrderHistoryHeaderComponent({
  compact,
  filter,
  horizontalPadding,
  onBackPress,
  onFilterChange,
  onNotificationsPress,
  onProfilePress,
  onQueryChange,
  query,
  safeAreaTop,
  width,
}: OrderHistoryHeaderProps) {
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
        <View style={styles.headingRow}>
          <Pressable
            accessibilityLabel="Back to Transaction History"
            accessibilityRole="button"
            onPress={onBackPress}
            style={styles.backButton}
          >
            <Ionicons color={colors.navy} name="chevron-back" size={25} />
          </Pressable>
          <View style={styles.headingCopy}>
            <Text style={[styles.title, compact && styles.compactTitle]}>
              Order History
            </Text>
            <Text style={styles.subtitle}>
              Every order the shop has taken, finished or otherwise.
            </Text>
          </View>
        </View>
        <View style={styles.searchBar}>
          <Ionicons
            color={colors.textSecondary}
            name="search-outline"
            size={22}
          />
          <TextInput
            accessibilityLabel="Search order history by name, order code, or phone"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={onQueryChange}
            placeholder="Search by name, order code, or phone..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={styles.input}
            value={query}
          />
        </View>
        <View style={styles.filterRow}>
          {filterOptions.map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: filter === option.value }}
              key={option.value}
              onPress={() => onFilterChange(option.value)}
              style={({ pressed }) => [
                styles.filterChip,
                filter === option.value && styles.filterChipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.filterLabel,
                  filter === option.value && styles.filterLabelActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

// Memoised because the list re-renders as pages arrive, and this header carries two
// images plus several icons.
export const OrderHistoryHeader = memo(OrderHistoryHeaderComponent);

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  backgroundFrame: {
    height: 240,
    position: "absolute",
    top: -34,
  },
  backgroundImage: { height: "100%", opacity: 0.5, width: "100%" },
  compactTitle: { fontSize: 24 },
  container: { overflow: "hidden", paddingBottom: 14 },
  filterChip: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  filterChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: "600",
  },
  filterLabelActive: { color: colors.surface },
  filterRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  headingCopy: { flex: 1, gap: 3 },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  input: { color: colors.navy, flex: 1, fontSize: 14.5, paddingVertical: 0 },
  pressed: { opacity: 0.7 },
  searchBar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  subtitle: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 17 },
  title: {
    color: colors.navy,
    fontSize: 27,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
});
