import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { colors } from "../../../theme/colors";
import type { ManualOrderMethod } from "../models/manualOrder";
import { ManualOrderFormSection } from "./ManualOrderFormSection";

const methods: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: ManualOrderMethod;
}[] = [
  { icon: "walk-outline", label: "Walk-in", value: "walkIn" },
  { icon: "bag-handle-outline", label: "Drop-off", value: "dropOff" },
  { icon: "car-outline", label: "Pickup & Delivery", value: "pickupDelivery" },
];

export function OrderMethodSelector({
  onChange,
  value,
}: {
  onChange: (value: ManualOrderMethod) => void;
  value: ManualOrderMethod;
}) {
  const { width } = useWindowDimensions();
  const compact = width <= 390;

  return (
    <ManualOrderFormSection icon="clipboard-outline" title="Order Method">
      <View style={[styles.options, compact && styles.compactOptions]}>
        {methods.map((method) => {
          const selected = value === method.value;
          return (
            <Pressable
              accessibilityLabel={method.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={method.value}
              onPress={() => onChange(method.value)}
              style={({ pressed }) => [
                styles.option,
                compact && styles.compactOption,
                selected && styles.selectedOption,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                color={selected ? colors.surface : colors.textSecondary}
                name={method.icon}
                size={19}
              />
              <Text
                style={[
                  styles.label,
                  compact && styles.compactLabel,
                  selected && styles.selectedLabel,
                ]}
              >
                {method.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ManualOrderFormSection>
  );
}

const styles = StyleSheet.create({
  compactLabel: { fontSize: 11 },
  compactOption: { gap: 4, minHeight: 58, paddingHorizontal: 4 },
  compactOptions: { gap: 6 },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  option: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#E2E7ED",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 5,
    justifyContent: "center",
    minHeight: 62,
    minWidth: 88,
    paddingHorizontal: 6,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pressed: { opacity: 0.75 },
  selectedLabel: { color: colors.surface },
  selectedOption: { backgroundColor: colors.navy, borderColor: colors.navy },
});
