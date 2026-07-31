import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../../theme/colors";
import type {
  BookingAdvancedFilters,
  BookingStatusFilter,
} from "../models/booking";
import { defaultBookingAdvancedFilters } from "../data/bookingFilters";

interface BookingsFilterModalProps {
  advancedFilters: BookingAdvancedFilters;
  onApply: (
    advancedFilters: BookingAdvancedFilters,
    statusFilter: BookingStatusFilter,
  ) => void;
  onClose: () => void;
  statusFilter: BookingStatusFilter;
}

interface FilterSectionProps<T extends string> {
  label: string;
  onChange: (value: T) => void;
  options: { label: string; value: T }[];
  value: T;
}

const serviceOptions: {
  label: string;
  value: BookingAdvancedFilters["service"];
}[] = [
  { label: "All", value: "all" },
  { label: "Wash/Dry/Fold", value: "washDryFold" },
  { label: "Dry Only", value: "dryOnly" },
  { label: "Self-Service", value: "selfService" },
];

const paymentOptions: {
  label: string;
  value: BookingAdvancedFilters["paymentStatus"];
}[] = [
  { label: "All", value: "all" },
  { label: "COD", value: "cod" },
  { label: "Paid", value: "paid" },
  { label: "Unpaid", value: "unpaid" },
];

const statusOptions: { label: string; value: BookingStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Confirmed", value: "confirmed" },
  { label: "In Process", value: "inProcess" },
  { label: "Ready", value: "ready" },
  { label: "Completed", value: "completed" },
];

const fulfillmentOptions: {
  label: string;
  value: BookingAdvancedFilters["fulfillmentType"];
}[] = [
  { label: "All", value: "all" },
  { label: "Pickup", value: "pickup" },
  { label: "Drop-off", value: "dropOff" },
  { label: "Delivery", value: "delivery" },
];

const dateOptions: {
  label: string;
  value: BookingAdvancedFilters["dateBucket"];
}[] = [
  { label: "All dates", value: "all" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
];

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

export function BookingsFilterModal({
  advancedFilters,
  onApply,
  onClose,
  statusFilter,
}: BookingsFilterModalProps) {
  const insets = useSafeAreaInsets();
  const [draftAdvancedFilters, setDraftAdvancedFilters] =
    useState(advancedFilters);
  const [draftStatusFilter, setDraftStatusFilter] = useState(statusFilter);

  const handleClear = () => {
    setDraftAdvancedFilters(defaultBookingAdvancedFilters);
    setDraftStatusFilter("all");
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close booking filters"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <View style={styles.handle} />
          <View style={styles.sheetHeading}>
            <View>
              <Text style={styles.title}>Filter bookings</Text>
              <Text style={styles.subtitle}>Narrow the operational list.</Text>
            </View>
            <Pressable
              accessibilityLabel="Clear all booking filters"
              accessibilityRole="button"
              onPress={handleClear}
              style={({ pressed }) => pressed && styles.pressed}
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
                setDraftAdvancedFilters((current) => ({
                  ...current,
                  service,
                }))
              }
              options={serviceOptions}
              value={draftAdvancedFilters.service}
            />
            <FilterSection
              label="Payment status"
              onChange={(paymentStatus) =>
                setDraftAdvancedFilters((current) => ({
                  ...current,
                  paymentStatus,
                }))
              }
              options={paymentOptions}
              value={draftAdvancedFilters.paymentStatus}
            />
            <FilterSection
              label="Booking status"
              onChange={setDraftStatusFilter}
              options={statusOptions}
              value={draftStatusFilter}
            />
            <FilterSection
              label="Pickup or drop-off type"
              onChange={(fulfillmentType) =>
                setDraftAdvancedFilters((current) => ({
                  ...current,
                  fulfillmentType,
                }))
              }
              options={fulfillmentOptions}
              value={draftAdvancedFilters.fulfillmentType}
            />
            <FilterSection
              label="Date"
              onChange={(dateBucket) =>
                setDraftAdvancedFilters((current) => ({
                  ...current,
                  dateBucket,
                }))
              }
              options={dateOptions}
              value={draftAdvancedFilters.dateBucket}
            />
          </ScrollView>

          <Pressable
            accessibilityLabel="Apply booking filters"
            accessibilityRole="button"
            onPress={() => onApply(draftAdvancedFilters, draftStatusFilter)}
            style={({ pressed }) => [
              styles.applyButton,
              pressed && styles.applyButtonPressed,
            ]}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: "rgba(8,35,71,0.22)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "86%",
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: "#D0D5DD",
    borderRadius: 2,
    height: 4,
    width: 38,
  },
  sheetHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  title: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 25,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
  },
  clearText: {
    color: colors.actionBlue,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  scrollContent: {
    paddingBottom: 12,
    paddingTop: 4,
  },
  section: {
    marginTop: 16,
  },
  sectionLabel: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 8,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#E6EAF0",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  selectedOption: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.actionBlue,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  selectedOptionText: {
    color: colors.actionBlue,
    fontWeight: "600",
  },
  applyButton: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    marginTop: 4,
  },
  applyButtonPressed: {
    opacity: 0.78,
  },
  applyButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.65,
  },
});
