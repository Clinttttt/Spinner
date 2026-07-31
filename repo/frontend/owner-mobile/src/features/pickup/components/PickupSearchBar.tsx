import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors } from "../../../theme/colors";

interface PickupSearchBarProps {
  onChangeText: (value: string) => void;
  onFilterPress: () => void;
  value: string;
}

export function PickupSearchBar({
  onChangeText,
  onFilterPress,
  value,
}: PickupSearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons color={colors.textSecondary} name="search-outline" size={22} />
      {value.length === 0 ? (
        <Text numberOfLines={1} pointerEvents="none" style={styles.placeholder}>
          Search by name, address, or booking ID...
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel="Search pickups by customer, address, booking code, or phone number"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      <View style={styles.divider} />
      <Pressable
        accessibilityLabel="Pickup filter help"
        accessibilityRole="button"
        onPress={onFilterPress}
        style={({ pressed }) => [
          styles.filterButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          color={colors.textSecondary}
          name="options-outline"
          size={22}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 54,
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
    right: 58,
  },
  divider: {
    backgroundColor: "#E2E8F0",
    height: 32,
    width: StyleSheet.hairlineWidth,
  },
  filterButton: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pressed: {
    backgroundColor: colors.surfaceSoft,
  },
});
