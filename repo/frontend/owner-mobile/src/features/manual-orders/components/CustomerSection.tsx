import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors } from "../../../theme/colors";
import {
  searchManualOrderCustomers,
  type ManualOrderCustomer,
} from "../services/manualOrdersService";
import { ManualOrderFormSection } from "./ManualOrderFormSection";

interface CustomerSectionProps {
  compact?: boolean;
  customerName: string;
  errors: { customerName?: string; phone?: string };
  onChangeName: (value: string) => void;
  onChangePhone: (value: string) => void;
  phone: string;
}

export function CustomerSection({
  compact = false,
  customerName,
  errors,
  onChangeName,
  onChangePhone,
  phone,
}: CustomerSectionProps) {
  const [lookup, setLookup] = useState("");
  const [matches, setMatches] = useState<ManualOrderCustomer[]>([]);

  useEffect(() => {
    const search = lookup.trim();
    if (search.length < 2) return;

    const timeout = setTimeout(() => {
      void searchManualOrderCustomers(search)
        .then((customers) => setMatches(customers.slice(0, 3)))
        .catch(() => setMatches([]));
    }, 250);

    return () => clearTimeout(timeout);
  }, [lookup]);

  const selectCustomer = (customer: ManualOrderCustomer) => {
    onChangeName(customer.fullName);
    onChangePhone(customer.mobileNumber);
    setLookup(customer.fullName);
    setMatches([]);
  };

  return (
    <ManualOrderFormSection icon="person-outline" title="Customer">
      <View style={[styles.searchField, compact && styles.compactSearchField]}>
        <Ionicons
          color={colors.textSecondary}
          name="search-outline"
          size={20}
        />
        <TextInput
          accessibilityLabel="Find customer by phone or name"
          onChangeText={(value) => {
            setLookup(value);
            if (value.trim().length < 2) setMatches([]);
          }}
          placeholder="Find customer by phone or name"
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, compact && styles.compactSearchInput]}
          value={lookup}
        />
      </View>
      {matches.map((customer) => (
        <Pressable
          accessibilityLabel={`Select ${customer.fullName}`}
          accessibilityRole="button"
          key={customer.customerId}
          onPress={() => selectCustomer(customer)}
          style={styles.customerMatch}
        >
          <Ionicons
            color={colors.navy}
            name="person-circle-outline"
            size={21}
          />
          <Text numberOfLines={1} style={styles.customerMatchText}>
            {customer.fullName} · {customer.mobileNumber}
          </Text>
          <Ionicons
            color={colors.textSecondary}
            name="chevron-forward"
            size={17}
          />
        </Pressable>
      ))}
      <View style={[styles.fields, compact && styles.compactFields]}>
        <LabeledInput
          compact={compact}
          error={errors.customerName}
          label="Customer Name *"
          onChangeText={onChangeName}
          placeholder="Enter customer name"
          value={customerName}
        />
        <LabeledInput
          compact={compact}
          error={errors.phone}
          keyboardType="phone-pad"
          label="Mobile Number *"
          onChangeText={onChangePhone}
          placeholder="09xx xxx xxxx"
          value={phone}
        />
      </View>
    </ManualOrderFormSection>
  );
}

interface LabeledInputProps {
  compact?: boolean;
  error?: string;
  keyboardType?: "default" | "phone-pad" | "email-address";
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}

export function LabeledInput({
  compact = false,
  error,
  keyboardType = "default",
  label,
  onChangeText,
  placeholder,
  value,
}: LabeledInputProps) {
  return (
    <View style={[styles.fieldGroup, compact && styles.compactFieldGroup]}>
      <Text style={[styles.fieldLabel, compact && styles.compactFieldLabel]}>
        {label}
      </Text>
      <TextInput
        accessibilityHint={error}
        accessibilityLabel={label}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.fieldInput,
          compact && styles.compactFieldInput,
          error && styles.errorInput,
        ]}
        value={value}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  compactFieldGroup: { flexBasis: "100%", minWidth: "100%" },
  compactFieldInput: { fontSize: 12.5, height: 44, marginTop: 5 },
  compactFieldLabel: { fontSize: 11.5 },
  compactFields: { flexDirection: "column" },
  compactSearchField: { height: 44 },
  compactSearchInput: { fontSize: 12.5 },
  customerMatch: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 12,
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
    minHeight: 46,
    paddingHorizontal: 10,
  },
  customerMatchText: {
    color: colors.navy,
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
  },
  errorInput: { borderColor: colors.danger },
  errorText: {
    color: colors.danger,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 4,
  },
  fieldGroup: { flex: 1, minWidth: 140 },
  fieldInput: {
    borderColor: "#E2E7ED",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.navy,
    fontSize: 13,
    height: 47,
    marginTop: 6,
    paddingHorizontal: 12,
  },
  fieldLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: "500" },
  fields: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  searchField: {
    alignItems: "center",
    borderColor: "#E2E7ED",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 48,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: colors.navy,
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    paddingVertical: 0,
  },
});
