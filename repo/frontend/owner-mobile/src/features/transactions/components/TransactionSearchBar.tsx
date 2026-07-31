import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { colors } from "../../../theme/colors";

interface TransactionSearchBarProps {
  onChangeText: (value: string) => void;
  onFilterPress: () => void;
  value: string;
}

export function TransactionSearchBar({
  onChangeText,
  onFilterPress,
  value,
}: TransactionSearchBarProps) {
  return (
    <View style={styles.searchBar}>
      <Ionicons color={colors.textSecondary} name="search-outline" size={23} />
      <TextInput
        accessibilityLabel="Search transaction history"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder="Search by note, type, or amount..."
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      <Pressable
        accessibilityLabel="Show transaction filters"
        accessibilityRole="button"
        hitSlop={4}
        onPress={onFilterPress}
        style={({ pressed }) => [
          styles.filterButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          color={colors.textSecondary}
          name="options-outline"
          size={23}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    alignItems: "center",
    borderLeftColor: colors.border,
    borderLeftWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 48,
  },
  input: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 14,
    height: "100%",
    marginLeft: 10,
    minWidth: 0,
    paddingVertical: 0,
  },
  pressed: { opacity: 0.65 },
  searchBar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.97)",
    borderColor: "#E6EAF0",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 54,
    paddingLeft: 16,
    paddingRight: 4,
  },
});
