import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../../theme/colors";

export interface ChargeAdjustments {
  additionalCharge: number;
  additionalChargeReason: string;
  discount: number;
  discountReason: string;
  loadCount: number;
}

interface AdjustChargesSheetProps extends ChargeAdjustments {
  onApply: (value: ChargeAdjustments) => void;
  onClose: () => void;
}

export function AdjustChargesSheet(props: AdjustChargesSheetProps) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<ChargeAdjustments>({
    additionalCharge: props.additionalCharge,
    additionalChargeReason: props.additionalChargeReason,
    discount: props.discount,
    discountReason: props.discountReason,
    loadCount: props.loadCount,
  });
  const [errors, setErrors] = useState<{
    additional?: string;
    discount?: string;
  }>({});

  const apply = () => {
    const nextErrors = {
      additional:
        draft.additionalCharge > 0 && !draft.additionalChargeReason.trim()
          ? "Add a reason for the additional charge."
          : undefined,
      discount:
        draft.discount > 0 && !draft.discountReason.trim()
          ? "Add a reason for the discount."
          : undefined,
    };
    setErrors(nextErrors);
    if (nextErrors.additional || nextErrors.discount) return;
    props.onApply(draft);
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={props.onClose}
      transparent
      visible
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <Pressable onPress={props.onClose} style={styles.backdrop} />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Adjust Charges</Text>
          <Text style={styles.subtitle}>
            Every price change must have a clear reason.
          </Text>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>Quantity / Load Count</Text>
            <View style={styles.stepper}>
              <Pressable
                accessibilityLabel="Decrease load count"
                onPress={() =>
                  setDraft((value) => ({
                    ...value,
                    loadCount: Math.max(1, value.loadCount - 1),
                  }))
                }
                style={styles.stepButton}
              >
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text style={styles.count}>{draft.loadCount}</Text>
              <Pressable
                accessibilityLabel="Increase load count"
                onPress={() =>
                  setDraft((value) => ({
                    ...value,
                    loadCount: value.loadCount + 1,
                  }))
                }
                style={styles.stepButton}
              >
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
            <MoneyField
              label="Additional Charge"
              onChange={(additionalCharge) =>
                setDraft((value) => ({ ...value, additionalCharge }))
              }
              value={draft.additionalCharge}
            />
            <ReasonField
              error={errors.additional}
              label="Additional Charge Reason"
              onChange={(additionalChargeReason) =>
                setDraft((value) => ({ ...value, additionalChargeReason }))
              }
              placeholder="e.g. Special handling"
              value={draft.additionalChargeReason}
            />
            <MoneyField
              label="Discount"
              onChange={(discount) =>
                setDraft((value) => ({ ...value, discount }))
              }
              value={draft.discount}
            />
            <ReasonField
              error={errors.discount}
              label="Discount Reason"
              onChange={(discountReason) =>
                setDraft((value) => ({ ...value, discountReason }))
              }
              placeholder="e.g. Promotion or Senior/PWD discount"
              value={draft.discountReason}
            />
          </ScrollView>
          <View style={styles.actions}>
            <Pressable onPress={props.onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={apply} style={styles.applyButton}>
              <Text style={styles.applyText}>Apply Changes</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MoneyField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.moneyInput}>
        <Text style={styles.peso}>₱</Text>
        <TextInput
          accessibilityLabel={label}
          keyboardType="decimal-pad"
          onChangeText={(text) =>
            onChange(Math.max(0, Number(text.replace(/[^0-9.]/g, "")) || 0))
          }
          style={styles.input}
          value={String(value)}
        />
      </View>
    </View>
  );
}

function ReasonField({
  error,
  label,
  onChange,
  placeholder,
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.reasonInput, error && styles.errorInput]}
        value={value}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  applyButton: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 13,
    flex: 1.4,
    height: 48,
    justifyContent: "center",
  },
  applyText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  backdrop: {
    backgroundColor: "rgba(8,35,71,0.24)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  cancelButton: {
    alignItems: "center",
    borderColor: colors.navy,
    borderRadius: 13,
    borderWidth: 1,
    flex: 1,
    height: 48,
    justifyContent: "center",
  },
  cancelText: { color: colors.navy, fontSize: 14, fontWeight: "600" },
  count: {
    color: colors.navy,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  error: { color: colors.danger, fontSize: 11.5, marginTop: 4 },
  errorInput: { borderColor: colors.danger },
  field: { marginTop: 14 },
  handle: {
    alignSelf: "center",
    backgroundColor: "#D0D5DD",
    borderRadius: 2,
    height: 4,
    width: 38,
  },
  input: {
    color: colors.navy,
    flex: 1,
    fontSize: 14,
    height: 46,
    paddingHorizontal: 8,
  },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  moneyInput: {
    alignItems: "center",
    borderColor: "#E2E7ED",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 46,
    marginTop: 6,
    paddingLeft: 12,
  },
  peso: { color: colors.navy, fontSize: 14, fontWeight: "600" },
  reasonInput: {
    borderColor: "#E2E7ED",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.navy,
    fontSize: 13,
    height: 46,
    marginTop: 6,
    paddingHorizontal: 12,
  },
  root: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  stepButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  stepper: {
    alignItems: "center",
    borderColor: "#E2E7ED",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 46,
    marginTop: 6,
    width: 136,
  },
  stepText: { color: colors.navy, fontSize: 20 },
  subtitle: { color: colors.textSecondary, fontSize: 12.5, marginTop: 3 },
  title: { color: colors.navy, fontSize: 20, fontWeight: "700", marginTop: 14 },
});
