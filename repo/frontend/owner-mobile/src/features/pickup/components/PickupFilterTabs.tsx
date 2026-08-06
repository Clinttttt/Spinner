import { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { colors } from "../../../theme/colors";
import type { PickupFilter } from "../models/pickup";

const filters: { label: string; value: PickupFilter }[] = [
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "On Route", value: "onRoute" },
  { label: "Completed", value: "completed" },
];

function PickupFilterTabsComponent({
  onChange,
  value,
}: {
  onChange: (value: PickupFilter) => void;
  value: PickupFilter;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      {filters.map((filter) => {
        const selected = filter.value === value;
        return (
          <Pressable
            accessibilityLabel={`Show ${filter.label.toLowerCase()} pickups`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={filter.value}
            onPress={() => onChange(filter.value)}
            style={({ pressed }) => [
              styles.tab,
              selected ? styles.selectedTab : styles.tabIdle,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.label,
                selected ? styles.selectedLabel : styles.idleLabel,
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 9,
    paddingRight: 2,
  },
  tab: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    height: 42,
    justifyContent: "center",
    minWidth: 82,
    paddingHorizontal: 14,
  },
  selectedTab: { backgroundColor: colors.navy, borderColor: colors.navy },
  tabIdle: { backgroundColor: colors.surface, borderColor: "#E6EAF0" },
  label: { fontSize: 13, lineHeight: 17 },
  selectedLabel: { color: colors.surface, fontWeight: "600" },
  idleLabel: { color: colors.textSecondary, fontWeight: "500" },
  pressed: { opacity: 0.72 },
});

// Filter tabs that only change when the filter does.
// Memoised so a keystroke in the search box does not redraw it.
export const PickupFilterTabs = memo(PickupFilterTabsComponent);
