import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { colors } from "../../../theme/colors";
import type { ManualServiceOption } from "../models/manualOrder";
import { ManualOrderFormSection } from "./ManualOrderFormSection";

function peso(value: number) {
  return `₱${value.toLocaleString("en-PH")}`;
}

export function ManualServiceSelector({
  error,
  loading,
  onToggle,
  selectedIds,
  services,
}: {
  error?: string;
  loading?: boolean;
  onToggle: (id: string) => void;
  selectedIds: string[];
  services: ManualServiceOption[];
}) {
  const { width } = useWindowDimensions();
  const compact = width <= 390;

  return (
    <ManualOrderFormSection
      icon="shirt-outline"
      subtitle="Select one or more services."
      title="Services"
    >
      <View style={[styles.options, compact && styles.compactOptions]}>
        {services.map((service) => {
          const selected = selectedIds.includes(service.id);
          return (
            <Pressable
              accessibilityLabel={`${service.name}, ${peso(service.price)} ${service.unitLabel}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              key={service.id}
              onPress={() => onToggle(service.id)}
              style={({ pressed }) => [
                styles.option,
                compact && styles.compactOption,
                selected && styles.selectedOption,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.icon,
                  compact && styles.compactIcon,
                  selected && styles.selectedIcon,
                ]}
              >
                <Ionicons
                  color={selected ? colors.surface : colors.navy}
                  name={
                    service.id === "self-service"
                      ? "water-outline"
                      : "shirt-outline"
                  }
                  size={19}
                />
              </View>
              <View style={styles.copy}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.name,
                    compact && styles.compactName,
                    selected && styles.selectedText,
                  ]}
                >
                  {service.name}
                </Text>
                <Text
                  style={[styles.price, selected && styles.selectedSubtext]}
                >
                  {peso(service.price)} {service.unitLabel}
                </Text>
              </View>
              <Ionicons
                color={selected ? colors.surface : colors.textMuted}
                name={selected ? "checkmark-circle" : "ellipse-outline"}
                size={19}
              />
            </Pressable>
          );
        })}
        {loading ? (
          <Text style={styles.message}>Loading available services…</Text>
        ) : null}
        {!loading && services.length === 0 ? (
          <Text style={styles.message}>
            No active services are available. Update Services &amp; Pricing
            before creating an order.
          </Text>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ManualOrderFormSection>
  );
}

const styles = StyleSheet.create({
  compactIcon: { borderRadius: 10, height: 34, width: 34 },
  compactName: { fontSize: 12.5 },
  compactOption: { gap: 8, minHeight: 54, paddingHorizontal: 8 },
  compactOptions: { gap: 8 },
  copy: { flex: 1, minWidth: 0 },
  error: { color: colors.danger, fontSize: 11.5, marginTop: 8 },
  icon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 11,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  name: { color: colors.navy, fontSize: 13, fontWeight: "600" },
  option: {
    alignItems: "center",
    borderColor: "#E2E7ED",
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 9,
    minHeight: 59,
    paddingHorizontal: 10,
  },
  options: { gap: 9 },
  pressed: { opacity: 0.75 },
  price: { color: colors.textSecondary, fontSize: 11.5, marginTop: 2 },
  selectedIcon: { backgroundColor: "rgba(255,255,255,0.16)" },
  selectedOption: { backgroundColor: colors.navy, borderColor: colors.navy },
  selectedSubtext: { color: "rgba(255,255,255,0.78)" },
  selectedText: { color: colors.surface },
});
