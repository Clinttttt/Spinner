import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors } from "../../../theme/colors";

interface BookingSearchBarProps {
  hasActiveFilters: boolean;
  onChangeText: (value: string) => void;
  onFilterPress: () => void;
  value: string;
}

export function BookingSearchBar({
  hasActiveFilters,
  onChangeText,
  onFilterPress,
  value,
}: BookingSearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons color={colors.textSecondary} name="search-outline" size={22} />
      {value.length === 0 ? (
        <Text numberOfLines={1} pointerEvents="none" style={styles.placeholder}>
          Search by name, address, or booking ID...
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel="Search bookings by customer, address, booking ID, or phone number"
        autoCapitalize="none"
        autoCorrect={false}
        multiline={false}
        numberOfLines={1}
        onChangeText={onChangeText}
        placeholder=""
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      <Pressable
        accessibilityLabel={
          hasActiveFilters
            ? "Open booking filters. Filters are active"
            : "Open booking filters"
        }
        accessibilityRole="button"
        hitSlop={4}
        onPress={onFilterPress}
        style={({ pressed }) => [
          styles.filterButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          color={hasActiveFilters ? colors.actionBlue : colors.textSecondary}
          name="options-outline"
          size={22}
        />
        {hasActiveFilters ? <View style={styles.activeDot} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "#E6EAF0",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 52,
    paddingLeft: 16,
    paddingRight: 4,
  },
  input: {
    color: colors.navy,
    flex: 1,
    fontSize: 14,
    height: "100%",
    includeFontPadding: false,
    marginLeft: 10,
    paddingVertical: 0,
  },
  placeholder: {
    color: colors.textMuted,
    fontSize: 14,
    left: 48,
    lineHeight: 20,
    position: "absolute",
    right: 50,
  },
  filterButton: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    position: "relative",
    width: 44,
  },
  activeDot: {
    backgroundColor: colors.gold,
    borderRadius: 3,
    height: 6,
    position: "absolute",
    right: 7,
    top: 7,
    width: 6,
  },
  pressed: {
    backgroundColor: colors.surfaceSoft,
  },
});
