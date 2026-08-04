import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSheetEntrance } from "../../../components/common/useSheetEntrance";

import { colors } from "../../../theme/colors";
import type { ManualOrderFilter } from "../models/manualOrder";

const options: { label: string; value: ManualOrderFilter }[] = [
  { label: "All orders", value: "all" },
  { label: "Walk-in", value: "walkIn" },
  { label: "Drop-off", value: "dropOff" },
  { label: "Pickup & Delivery", value: "pickupDelivery" },
  { label: "In Process", value: "inProcess" },
  { label: "Completed", value: "completed" },
];

interface ManualOrdersFilterSheetProps {
  onChange: (value: ManualOrderFilter) => void;
  onClose: () => void;
  value: ManualOrderFilter;
}

export function ManualOrdersFilterSheet({
  onChange,
  onClose,
  value,
}: ManualOrdersFilterSheetProps) {
  const insets = useSafeAreaInsets();
  const entrance = useSheetEntrance();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close manual order filters"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            entrance,
            { paddingBottom: Math.max(insets.bottom, 18) },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Filter manual orders</Text>
          <Text style={styles.subtitle}>Choose one operational view.</Text>
          <View style={styles.options}>
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.selectedOption,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.selectedOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(8,35,71,0.24)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: "#D0D5DD",
    borderRadius: 2,
    height: 4,
    width: 38,
  },
  option: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#E6EAF0",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 13,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 18 },
  pressed: { opacity: 0.7 },
  root: { flex: 1, justifyContent: "flex-end" },
  selectedOption: { backgroundColor: colors.navy, borderColor: colors.navy },
  selectedOptionText: { color: colors.surface, fontWeight: "600" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 3 },
  title: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 15,
  },
});
