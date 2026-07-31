import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { colors } from "../../../theme/colors";
import type { ManualOrderFilter } from "../models/manualOrder";

const options: { label: string; value: ManualOrderFilter }[] = [
  { label: "All", value: "all" },
  { label: "Walk-in", value: "walkIn" },
  { label: "Drop-off", value: "dropOff" },
  { label: "Pickup", value: "pickupDelivery" },
  { label: "In Process", value: "inProcess" },
  { label: "Completed", value: "completed" },
];

export function ManualOrdersFilterTabs({
  onChange,
  value,
}: {
  onChange: (value: ManualOrderFilter) => void;
  value: ManualOrderFilter;
}) {
  return (
    <ScrollView
      accessibilityLabel="Manual order filters"
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.filter,
              selected ? styles.selected : styles.unselected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.text,
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
  content: { gap: 8, paddingRight: 4 },
  filter: {
    alignItems: "center",
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  pressed: { opacity: 0.72 },
  selected: { backgroundColor: colors.navy, borderColor: colors.navy },
  selectedText: { color: colors.surface, fontWeight: "600" },
  text: { fontSize: 13, lineHeight: 17 },
  unselected: { backgroundColor: colors.surface, borderColor: "#E6EAF0" },
  unselectedText: { color: colors.textSecondary, fontWeight: "500" },
});
