import { useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSheetEntrance } from "../../../components/common/useSheetEntrance";

import { colors } from "../../../theme/colors";
import { defaultReportFilters } from "../data/reportsConfig";
import type { ReportFilters, TopServiceReport } from "../models/reports";

interface FilterSectionProps<T extends string> {
  label: string;
  onChange: (value: T) => void;
  options: { label: string; value: T }[];
  value: T;
}

function FilterSection<T extends string>({
  label,
  onChange,
  options,
  value,
}: FilterSectionProps<T>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => onChange(option.value)}
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
    </View>
  );
}

interface ReportsFilterModalProps {
  filters: ReportFilters;
  onApply: (filters: ReportFilters) => void;
  onClose: () => void;
  services: TopServiceReport[];
}

export function ReportsFilterModal({
  filters,
  onApply,
  onClose,
  services,
}: ReportsFilterModalProps) {
  const insets = useSafeAreaInsets();
  const entrance = useSheetEntrance();
  const [draft, setDraft] = useState(filters);
  const serviceOptions = [
    { label: "All", value: "all" },
    ...services.map((service) => ({
      label: service.name,
      value: service.id,
    })),
  ] as { label: string; value: ReportFilters["service"] }[];

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close report filters"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            entrance,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View>
              <Text style={styles.title}>Filter reports</Text>
              <Text style={styles.subtitle}>Refine the dashboard summary.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDraft(defaultReportFilters)}
            >
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <FilterSection
              label="Service"
              onChange={(service) =>
                setDraft((current) => ({ ...current, service }))
              }
              options={serviceOptions}
              value={draft.service}
            />
            <FilterSection
              label="Payment method"
              onChange={(payment) =>
                setDraft((current) => ({ ...current, payment }))
              }
              options={[
                { label: "All", value: "all" },
                { label: "COD", value: "cod" },
                { label: "Paid", value: "paid" },
              ]}
              value={draft.payment}
            />
            <FilterSection
              label="Order status"
              onChange={(status) =>
                setDraft((current) => ({ ...current, status }))
              }
              options={[
                { label: "All", value: "all" },
                { label: "Completed", value: "completed" },
                { label: "Active", value: "active" },
              ]}
              value={draft.status}
            />
            <FilterSection
              label="Pickup or drop-off"
              onChange={(fulfillment) =>
                setDraft((current) => ({ ...current, fulfillment }))
              }
              options={[
                { label: "All", value: "all" },
                { label: "Pickup", value: "pickup" },
                { label: "Drop-off", value: "dropOff" },
              ]}
              value={draft.fulfillment}
            />
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onApply(draft);
              onClose();
            }}
            style={({ pressed }) => [
              styles.applyButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.applyText}>Apply Filters</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  applyButton: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    marginTop: 4,
  },
  applyText: { color: colors.surface, fontSize: 14, fontWeight: "600" },
  backdrop: {
    backgroundColor: "rgba(8,35,71,0.22)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  clearText: { color: colors.actionBlue, fontSize: 13, fontWeight: "600" },
  handle: {
    alignSelf: "center",
    backgroundColor: "#D0D5DD",
    borderRadius: 2,
    height: 4,
    width: 38,
  },
  heading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  option: {
    alignItems: "center",
    borderColor: "#E6EAF0",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 12,
  },
  optionText: { color: colors.textSecondary, fontSize: 12, fontWeight: "500" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pressed: { opacity: 0.68 },
  root: { flex: 1, justifyContent: "flex-end" },
  scrollContent: { paddingBottom: 12, paddingTop: 4 },
  section: { marginTop: 16 },
  sectionLabel: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.actionBlue,
  },
  selectedOptionText: { color: colors.actionBlue, fontWeight: "600" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "86%",
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
  },
  title: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 25,
  },
});
