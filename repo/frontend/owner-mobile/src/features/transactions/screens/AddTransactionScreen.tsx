import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { describeApiError } from "../../../api/apiClient";
import { appDialog } from "../../../components/common/DialogProvider";
import { colors } from "../../../theme/colors";
import { TransactionFormHeader } from "../components/TransactionFormHeader";
import { TransactionRow } from "../components/TransactionRow";
import type { CreateTransactionInput } from "../models/transaction";
import {
  refreshTransactions,
  saveTransaction,
  useTransactions,
} from "../services/transactionStore";

type ManualTransactionKind = CreateTransactionInput["kind"];
type PickerMode = "date" | "time" | null;

interface AddTransactionScreenProps {
  onBackPress: () => void;
  onViewAllPress: () => void;
}

interface FormErrors {
  amount?: string;
  occurredAt?: string;
  type?: string;
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function sanitizeAmount(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const [whole, ...decimals] = normalized.split(".");
  return decimals.length > 0
    ? `${whole}.${decimals.join("").slice(0, 2)}`
    : whole;
}

interface TypeCardProps {
  kind: ManualTransactionKind;
  onPress: () => void;
  selected: boolean;
}

function TypeCard({ kind, onPress, selected }: TypeCardProps) {
  const isIncome = kind === "manualIncome";
  const accent = isIncome ? "#2E9B36" : colors.danger;
  const selectedBackground = isIncome ? "#F7FCF8" : "#FFF9F9";
  const selectedBorder = isIncome ? "#B7E3C0" : "#F4C7C7";

  return (
    <Pressable
      accessibilityLabel={`${isIncome ? "Income" : "Deduction"} transaction type`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.typeCard,
        selected && {
          backgroundColor: selectedBackground,
          borderColor: selectedBorder,
        },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.typeIcon,
          { backgroundColor: isIncome ? "#ECF8EF" : "#FDECEC" },
        ]}
      >
        <Ionicons
          color={accent}
          name={isIncome ? "arrow-up-outline" : "arrow-down-outline"}
          size={21}
        />
      </View>
      <View style={styles.typeCopy}>
        <Text style={styles.typeTitle}>
          {isIncome ? "Income" : "Deduction"}
        </Text>
        <Text style={styles.typeDescription}>
          {isIncome ? "Record money coming in." : "Record money deducted."}
        </Text>
      </View>
      <View
        style={[
          styles.radio,
          selected && { backgroundColor: accent, borderColor: accent },
        ]}
      >
        {selected ? (
          <Ionicons color={colors.surface} name="checkmark" size={12} />
        ) : null}
      </View>
    </Pressable>
  );
}

export function AddTransactionScreen({
  onBackPress,
  onViewAllPress,
}: AddTransactionScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const transactions = useTransactions();
  const pagePadding = width <= 360 ? 12 : 14;
  const [type, setType] = useState<ManualTransactionKind>("manualIncome");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    void refreshTransactions().catch(() => undefined);
  }, []);

  const selectType = (value: ManualTransactionKind) => {
    setType(value);
    setErrors((current) => ({ ...current, type: undefined }));
    setSuccessMessage("");
  };

  const handleDateTimeChange = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    if (event.type === "dismissed" || !selected) {
      setPickerMode(null);
      return;
    }

    const next = new Date(occurredAt);
    if (pickerMode === "date") {
      next.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate(),
      );
      setOccurredAt(next > new Date() ? new Date() : next);
      setPickerMode("time");
      return;
    }

    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    setOccurredAt(next > new Date() ? new Date() : next);
    setErrors((current) => ({ ...current, occurredAt: undefined }));
    setPickerMode(null);
  };

  const submit = async () => {
    if (saving) return;
    const parsedAmount = Number(amount);
    const nextErrors: FormErrors = {
      amount:
        Number.isFinite(parsedAmount) && parsedAmount > 0
          ? undefined
          : "Enter an amount greater than zero.",
      occurredAt:
        occurredAt.getTime() <= Date.now()
          ? undefined
          : "Select a valid date and time.",
      type: type ? undefined : "Select a transaction type.",
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSaving(true);
    setSuccessMessage("");
    try {
      await saveTransaction({
        amount: parsedAmount,
        kind: type,
        note: notes,
        occurredAt: occurredAt.toISOString(),
      });
      setAmount("");
      setNotes("");
      setOccurredAt(new Date());
      setSuccessMessage("Transaction saved successfully.");
      if (Platform.OS === "android") {
        ToastAndroid.show(
          "Transaction saved successfully.",
          ToastAndroid.SHORT,
        );
      }
    } catch (error) {
      await appDialog.notify({
        message: describeApiError(error, "Please try again."),
        title: "Unable to save transaction",
        tone: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <TransactionFormHeader
        horizontalPadding={pagePadding}
        onBackPress={onBackPress}
        safeAreaTop={insets.top}
        width={width}
      />
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom, 14) + 20,
            paddingHorizontal: pagePadding,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.formSurface}
      >
        <View>
          <Text style={styles.sectionLabel}>Choose Type</Text>
          <View style={styles.typeRow}>
            <TypeCard
              kind="manualIncome"
              onPress={() => selectType("manualIncome")}
              selected={type === "manualIncome"}
            />
            <TypeCard
              kind="manualDeduction"
              onPress={() => selectType("manualDeduction")}
              selected={type === "manualDeduction"}
            />
          </View>
          {errors.type ? <Text style={styles.error}>{errors.type}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Amount</Text>
          <View
            style={[styles.inputShell, errors.amount && styles.errorBorder]}
          >
            <Text style={styles.prefix}>₱</Text>
            <TextInput
              accessibilityLabel="Transaction amount"
              keyboardType="decimal-pad"
              onChangeText={(value) => {
                setAmount(sanitizeAmount(value));
                setErrors((current) => ({ ...current, amount: undefined }));
                setSuccessMessage("");
              }}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={amount}
            />
          </View>
          {errors.amount ? (
            <Text style={styles.error}>{errors.amount}</Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Date & Time</Text>
          <Pressable
            accessibilityLabel={`Transaction date and time, ${formatDateTime(occurredAt)}`}
            accessibilityRole="button"
            onPress={() => setPickerMode("date")}
            style={({ pressed }) => [
              styles.dateButton,
              errors.occurredAt && styles.errorBorder,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              color={colors.textSecondary}
              name="calendar-outline"
              size={20}
            />
            <Text style={styles.dateText}>{formatDateTime(occurredAt)}</Text>
            <Ionicons
              color={colors.textSecondary}
              name="chevron-down"
              size={18}
            />
          </Pressable>
          {errors.occurredAt ? (
            <Text style={styles.error}>{errors.occurredAt}</Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.notesLabelRow}>
            <Text style={styles.fieldLabel}>Notes</Text>
            <Text style={styles.optional}>(Optional)</Text>
          </View>
          <TextInput
            accessibilityLabel="Transaction notes"
            maxLength={160}
            multiline
            onChangeText={(value) => {
              setNotes(value);
              setSuccessMessage("");
            }}
            placeholder="Add a note..."
            placeholderTextColor={colors.textMuted}
            style={styles.notesInput}
            textAlignVertical="top"
            value={notes}
          />
        </View>

        {successMessage ? (
          <View accessibilityLiveRegion="polite" style={styles.successBanner}>
            <Ionicons color="#2E9B36" name="checkmark-circle" size={19} />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityLabel="Save transaction"
          accessibilityRole="button"
          accessibilityState={{ busy: saving, disabled: saving }}
          disabled={saving}
          onPress={submit}
          style={({ pressed }) => [
            styles.saveButton,
            saving && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={colors.surface} size="small" />
          ) : (
            <Ionicons color={colors.surface} name="save-outline" size={19} />
          )}
          <Text style={styles.saveText}>
            {saving ? "Saving…" : "Save Transaction"}
          </Text>
        </Pressable>

        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Transactions</Text>
            <Pressable
              accessibilityLabel="View all transactions"
              accessibilityRole="button"
              hitSlop={6}
              onPress={onViewAllPress}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.viewAll}>View All</Text>
            </Pressable>
          </View>
          <View style={styles.recentCard}>
            {transactions.slice(0, 3).map((item, index) => (
              <TransactionRow
                compact
                isLast={index === Math.min(3, transactions.length) - 1}
                item={item}
                key={item.id}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {pickerMode ? (
        <DateTimePicker
          maximumDate={new Date()}
          mode={pickerMode}
          onChange={handleDateTimeChange}
          value={occurredAt}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 17, paddingTop: 12 },
  dateButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    height: 50,
    paddingHorizontal: 14,
  },
  dateText: { color: colors.textPrimary, flex: 1, fontSize: 14 },
  disabled: { opacity: 0.58 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 17, marginTop: 5 },
  errorBorder: { borderColor: colors.danger },
  fieldGroup: { gap: 7 },
  fieldLabel: { color: colors.navy, fontSize: 14, fontWeight: "600" },
  formSurface: {
    backgroundColor: colors.background,
    position: "relative",
    zIndex: 1,
  },
  input: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15,
    height: "100%",
    paddingVertical: 0,
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    height: 50,
    paddingHorizontal: 14,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 13,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 14,
    minHeight: 82,
    padding: 13,
  },
  notesLabelRow: { alignItems: "center", flexDirection: "row", gap: 5 },
  optional: { color: colors.textSecondary, fontSize: 12 },
  prefix: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
    marginRight: 9,
  },
  pressed: { opacity: 0.72 },
  radio: {
    alignItems: "center",
    borderColor: colors.textMuted,
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    top: 12,
    width: 20,
  },
  recentCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
  recentHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  recentSection: { marginTop: 4 },
  recentTitle: { color: colors.navy, fontSize: 17, fontWeight: "700" },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 14,
    flexDirection: "row",
    gap: 9,
    height: 50,
    justifyContent: "center",
  },
  saveText: { color: colors.surface, fontSize: 14.5, fontWeight: "700" },
  screen: { backgroundColor: colors.background, flex: 1 },
  sectionLabel: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  successBanner: {
    alignItems: "center",
    backgroundColor: "#F1FAF4",
    borderColor: "#CDEBD5",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  successText: { color: "#216E39", flex: 1, fontSize: 13, fontWeight: "500" },
  typeCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minHeight: 118,
    padding: 12,
    position: "relative",
  },
  typeCopy: { flex: 1, marginTop: 10 },
  typeDescription: {
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 3,
  },
  typeIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  typeRow: { flexDirection: "row", gap: 10 },
  typeTitle: { color: colors.navy, fontSize: 14.5, fontWeight: "700" },
  viewAll: { color: colors.navy, fontSize: 13.5, fontWeight: "600" },
});
