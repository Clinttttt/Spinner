import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "../../../theme/colors";
import { radii } from "../../../theme/radii";
import { spacing } from "../../../theme/spacing";
import type { ServiceSetting } from "../models/settings";
import type { LaundryServiceInput } from "../services/settingsService";

interface ServiceEditorModalProps {
  onClose: () => void;
  onSave: (input: LaundryServiceInput) => Promise<void>;
  service?: ServiceSetting;
}

interface FieldProps {
  keyboardType?: "default" | "decimal-pad";
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}

function Field({
  keyboardType = "default",
  label,
  onChangeText,
  placeholder,
  value,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="sentences"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function numberValue(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return 0;
  return Number(normalized);
}

export function ServiceEditorModal({
  onClose,
  onSave,
  service,
}: ServiceEditorModalProps) {
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [unitLabel, setUnitLabel] = useState(service?.unit ?? "per load");
  const [basePrice, setBasePrice] = useState(String(service?.basePrice ?? 0));
  const [deliveryFee, setDeliveryFee] = useState(
    service?.deliveryFee === null || service?.deliveryFee === undefined
      ? ""
      : String(service.deliveryFee),
  );
  const [supportsPickup, setSupportsPickup] = useState(
    service?.supportsPickupAndDelivery ?? false,
  );
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const parsedBasePrice = numberValue(basePrice);
    const parsedDeliveryFee = deliveryFee.trim()
      ? numberValue(deliveryFee)
      : null;

    if (!name.trim()) {
      setError("Service name is required.");
      return;
    }
    if (!unitLabel.trim()) {
      setError("Pricing unit is required.");
      return;
    }
    if (
      !Number.isFinite(parsedBasePrice) ||
      parsedBasePrice < 0 ||
      (parsedDeliveryFee !== null &&
        (!Number.isFinite(parsedDeliveryFee) || parsedDeliveryFee < 0))
    ) {
      setError("Prices must be valid amounts of zero or more.");
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        unitLabel: unitLabel.trim(),
        basePrice: parsedBasePrice,
        supportsPickupAndDelivery: supportsPickup,
        deliveryFee: supportsPickup ? parsedDeliveryFee : null,
      });
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The service could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {service ? "Edit Service" : "Add Service"}
            </Text>
            <Text style={styles.subtitle}>
              Service details and pricing are saved to the API.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close service editor"
            accessibilityRole="button"
            disabled={saving}
            onPress={onClose}
            style={styles.closeButton}
          >
            <Ionicons color={colors.navy} name="close" size={22} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <Field
            label="Service Name"
            onChangeText={setName}
            placeholder="e.g. Wash, Dry & Fold"
            value={name}
          />
          <Field
            label="Description"
            onChangeText={setDescription}
            placeholder="Describe what the service includes"
            value={description}
          />
          <Field
            label="Pricing Unit"
            onChangeText={setUnitLabel}
            placeholder="e.g. per load"
            value={unitLabel}
          />
          <Field
            keyboardType="decimal-pad"
            label="Base Price"
            onChangeText={setBasePrice}
            placeholder="0.00"
            value={basePrice}
          />

          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.switchTitle}>Pickup & delivery support</Text>
              <Text style={styles.switchSubtitle}>
                Allow this service for pickup and delivery orders.
              </Text>
            </View>
            <Switch
              onValueChange={setSupportsPickup}
              thumbColor={colors.surface}
              trackColor={{ false: "#D8DEE7", true: colors.navy }}
              value={supportsPickup}
            />
          </View>

          {supportsPickup ? (
            <Field
              keyboardType="decimal-pad"
              label="Delivery Fee (optional)"
              onChangeText={setDeliveryFee}
              placeholder="0.00"
              value={deliveryFee}
            />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: saving, disabled: saving }}
            disabled={saving}
            onPress={onClose}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryLabel}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void submit()}
            style={[styles.primaryButton, saving && styles.disabled]}
          >
            {saving ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <Ionicons color={colors.surface} name="save-outline" size={18} />
            )}
            <Text style={styles.primaryLabel}>
              {saving ? "Saving..." : "Save Service"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  disabled: { opacity: 0.55 },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  field: { gap: 7 },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  form: {
    gap: spacing.md,
    padding: spacing.md,
  },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    flex: 1.35,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 50,
  },
  primaryLabel: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "700",
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 0.8,
    justifyContent: "center",
    minHeight: 50,
  },
  secondaryLabel: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  switchCopy: { flex: 1, minWidth: 0 },
  switchRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  switchSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  switchTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "800",
  },
});
