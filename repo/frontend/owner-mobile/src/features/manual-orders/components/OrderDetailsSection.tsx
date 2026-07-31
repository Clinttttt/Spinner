import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors } from "../../../theme/colors";
import type {
  ManualOrderMethod,
  ManualPaymentMethod,
} from "../models/manualOrder";
import { ManualOrderFormSection } from "./ManualOrderFormSection";

const scheduleOptions = [
  "Today · Current time",
  "Tomorrow · 10:00 AM",
  "Custom",
];

interface OrderDetailsSectionProps {
  address: string;
  addressError?: string;
  loadCount: number;
  method: ManualOrderMethod;
  onAddressChange: (value: string) => void;
  onLoadCountChange: (value: number) => void;
  onPaymentChange: (value: ManualPaymentMethod) => void;
  onScheduleChange: (value: string) => void;
  paymentMethod: ManualPaymentMethod;
  scheduleError?: string;
  scheduleLabel: string;
}

export function OrderDetailsSection({
  address,
  addressError,
  loadCount,
  method,
  onAddressChange,
  onLoadCountChange,
  onPaymentChange,
  onScheduleChange,
  paymentMethod,
  scheduleError,
  scheduleLabel,
}: OrderDetailsSectionProps) {
  const customSchedule = scheduleLabel.startsWith("Custom");

  return (
    <ManualOrderFormSection icon="calendar-outline" title="Order Details">
      <Text style={styles.label}>Load Count</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityLabel="Decrease load count"
          accessibilityRole="button"
          disabled={loadCount <= 1}
          onPress={() => onLoadCountChange(Math.max(1, loadCount - 1))}
          style={styles.stepperButton}
        >
          <Ionicons
            color={loadCount <= 1 ? colors.textMuted : colors.navy}
            name="remove"
            size={20}
          />
        </Pressable>
        <Text
          accessibilityLabel={`${loadCount} loads`}
          style={styles.stepperValue}
        >
          {loadCount}
        </Text>
        <Pressable
          accessibilityLabel="Increase load count"
          accessibilityRole="button"
          onPress={() => onLoadCountChange(loadCount + 1)}
          style={styles.stepperButton}
        >
          <Ionicons color={colors.navy} name="add" size={20} />
        </Pressable>
      </View>

      <Text style={[styles.label, styles.fieldGap]}>Schedule</Text>
      <View style={styles.scheduleOptions}>
        {scheduleOptions.map((option) => {
          const selected =
            option === "Custom" ? customSchedule : scheduleLabel === option;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option}
              onPress={() =>
                onScheduleChange(option === "Custom" ? "Custom · " : option)
              }
              style={[styles.scheduleOption, selected && styles.selectedOption]}
            >
              <Text
                style={[
                  styles.optionText,
                  selected && styles.selectedOptionText,
                ]}
              >
                {option.split(" · ")[0]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {customSchedule ? (
        <TextInput
          accessibilityLabel="Custom date and time"
          onChangeText={(value) => onScheduleChange(`Custom · ${value}`)}
          placeholder="Jul 18, 2026 · 2:00 PM"
          placeholderTextColor={colors.textMuted}
          style={[styles.textInput, scheduleError && styles.errorInput]}
          value={scheduleLabel.replace("Custom · ", "")}
        />
      ) : null}
      {scheduleError ? <Text style={styles.error}>{scheduleError}</Text> : null}

      <Text style={[styles.label, styles.fieldGap]}>Payment</Text>
      <View style={styles.paymentOptions}>
        <PaymentOption
          label={method === "pickupDelivery" ? "COD" : "Pay on Claim"}
          onPress={() => onPaymentChange("cash")}
          selected={paymentMethod === "cash"}
        />
        <PaymentOption
          label="QR Online"
          onPress={() => onPaymentChange("qrOnline")}
          selected={paymentMethod === "qrOnline"}
        />
      </View>

      {method === "pickupDelivery" ? (
        <View style={styles.addressGroup}>
          <Text style={styles.label}>Pickup & Delivery Address *</Text>
          <TextInput
            accessibilityHint="Address is required for pickup and delivery orders"
            accessibilityLabel="Pickup and delivery address"
            multiline
            onChangeText={onAddressChange}
            placeholder="House number, street, barangay, city"
            placeholderTextColor={colors.textMuted}
            style={[styles.addressInput, addressError && styles.errorInput]}
            textAlignVertical="top"
            value={address}
          />
          <Text style={styles.helper}>
            Address is required for pickup and delivery orders.
          </Text>
          {addressError ? (
            <Text style={styles.error}>{addressError}</Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.helper}>
          Address is optional for walk-in and drop-off orders.
        </Text>
      )}
    </ManualOrderFormSection>
  );
}

function PaymentOption({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.paymentOption, selected && styles.selectedOption]}
    >
      <Text style={[styles.optionText, selected && styles.selectedOptionText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addressGroup: { marginTop: 16 },
  addressInput: {
    borderColor: "#E2E7ED",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.navy,
    fontSize: 13,
    minHeight: 78,
    marginTop: 7,
    padding: 12,
  },
  error: { color: colors.danger, fontSize: 11.5, lineHeight: 16, marginTop: 4 },
  errorInput: { borderColor: colors.danger },
  fieldGap: { marginTop: 16 },
  helper: {
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 7,
  },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  optionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  paymentOption: {
    alignItems: "center",
    borderColor: "#E2E7ED",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  paymentOptions: { flexDirection: "row", gap: 9, marginTop: 7 },
  scheduleOption: {
    alignItems: "center",
    borderColor: "#E2E7ED",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 82,
    paddingHorizontal: 8,
  },
  scheduleOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 7,
  },
  selectedOption: { backgroundColor: colors.navy, borderColor: colors.navy },
  selectedOptionText: { color: colors.surface },
  stepper: {
    alignItems: "center",
    borderColor: "#E2E7ED",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 46,
    marginTop: 7,
    width: "100%",
  },
  stepperButton: {
    alignItems: "center",
    flex: 1,
    height: 44,
    justifyContent: "center",
  },
  stepperValue: {
    color: colors.navy,
    width: 52,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  textInput: {
    borderColor: "#E2E7ED",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.navy,
    fontSize: 13,
    height: 46,
    marginTop: 8,
    paddingHorizontal: 12,
  },
});
