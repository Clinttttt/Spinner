import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { colors } from "../../../theme/colors";
import type { TransactionFilter } from "../models/transaction";

const filters: { label: string; value: TransactionFilter }[] = [
  { label: "All", value: "all" },
  { label: "Income", value: "income" },
  { label: "Deduction", value: "deduction" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "thisWeek" },
];

interface TransactionFilterTabsProps {
  onChange: (value: TransactionFilter) => void;
  value: TransactionFilter;
}

export function TransactionFilterTabs({
  onChange,
  value,
}: TransactionFilterTabsProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {filters.map((filter) => {
        const selected = value === filter.value;
        return (
          <Pressable
            accessibilityLabel={`${filter.label} transactions filter`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={filter.value}
            onPress={() => onChange(filter.value)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.selectedChip,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#E6EAF0",
    borderRadius: 15,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    minWidth: 82,
    paddingHorizontal: 16,
  },
  content: { gap: 10, paddingRight: 8 },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  pressed: { opacity: 0.72 },
  selectedChip: { backgroundColor: colors.navy, borderColor: colors.navy },
  selectedLabel: { color: colors.surface, fontWeight: "600" },
});
