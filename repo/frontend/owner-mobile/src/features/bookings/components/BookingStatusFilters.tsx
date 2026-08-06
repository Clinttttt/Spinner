import { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { colors } from "../../../theme/colors";
import type { BookingStatusFilter } from "../models/booking";

interface BookingStatusFiltersProps {
  onChange: (value: BookingStatusFilter) => void;
  value: BookingStatusFilter;
}

const statusOptions: { label: string; value: BookingStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Confirmed", value: "confirmed" },
  { label: "In Process", value: "inProcess" },
  { label: "Ready", value: "ready" },
  { label: "Completed", value: "completed" },
];

function BookingStatusFiltersComponent({
  onChange,
  value,
}: BookingStatusFiltersProps) {
  return (
    <ScrollView
      accessibilityLabel="Booking status filters"
      contentContainerStyle={styles.content}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      {statusOptions.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            accessibilityLabel={`Show ${option.label.toLowerCase()} bookings`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.filter,
              selected ? styles.selectedFilter : styles.unselectedFilter,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                selected ? styles.selectedText : styles.unselectedText,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 8,
    paddingRight: 4,
  },
  filter: {
    alignItems: "center",
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  selectedFilter: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  unselectedFilter: {
    backgroundColor: colors.surface,
    borderColor: "#E6EAF0",
  },
  filterText: {
    fontSize: 13,
    lineHeight: 17,
  },
  selectedText: {
    color: colors.surface,
    fontWeight: "600",
  },
  unselectedText: {
    color: colors.textSecondary,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.72,
  },
});

// Six chips that only change when the status filter does.
// Memoised so a keystroke in the search box does not redraw it.
export const BookingStatusFilters = memo(BookingStatusFiltersComponent);
