import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { describeApiError } from "../../../api/apiClient";
import { useDialog } from "../../../components/common/DialogProvider";
import type { RootTabParamList } from "../../../navigation/types";
import { colors } from "../../../theme/colors";
import {
  AdjustChargesSheet,
  type ChargeAdjustments,
} from "../components/AdjustChargesSheet";
import { CustomerSection } from "../components/CustomerSection";
import { ManualOrderPageHeader } from "../components/ManualOrderPageHeader";
import { ManualServiceSelector } from "../components/ManualServiceSelector";
import { OptionalDetailsAccordion } from "../components/OptionalDetailsAccordion";
import { OrderDetailsSection } from "../components/OrderDetailsSection";
import { OrderMethodSelector } from "../components/OrderMethodSelector";
import { OrderSummaryCard } from "../components/OrderSummaryCard";
import { defaultManualOrderDraft } from "../data/manualOrderDefaults";
import type {
  ManualOrder,
  ManualOrderDraft,
  ManualServiceOption,
} from "../models/manualOrder";
import {
  calculateManualOrder,
  createManualOrder,
  getManualOrderServices,
  PossibleDuplicateOrderError,
} from "../services/manualOrdersService";

interface CreateManualOrderScreenProps {
  navigation: BottomTabNavigationProp<RootTabParamList, "ManualOrders">;
  onCancel: () => void;
  onCreated: (order: ManualOrder) => void;
}

interface FormErrors {
  address?: string;
  customerName?: string;
  phone?: string;
  schedule?: string;
  services?: string;
}

export function CreateManualOrderScreen({
  navigation,
  onCancel,
  onCreated,
}: CreateManualOrderScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const dialog = useDialog();
  const compact = width <= 390;
  const pagePadding = compact ? 16 : 14;
  const [draft, setDraft] = useState<ManualOrderDraft>({
    ...defaultManualOrderDraft,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [adjustmentsVisible, setAdjustmentsVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState<ManualServiceOption[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const calculation = useMemo(
    () => calculateManualOrder(draft, services),
    [draft, services],
  );

  useEffect(() => {
    let active = true;
    getManualOrderServices()
      .then((available) => {
        if (!active) return;
        setServices(available);
        setDraft((current) => ({
          ...current,
          selectedServiceIds:
            current.selectedServiceIds.length > 0 || available.length === 0
              ? current.selectedServiceIds
              : [available[0].id],
        }));
      })
      .catch((error: unknown) => {
        if (!active) return;
        void dialog.notify({
          message: describeApiError(error, "Please try again."),
          title: "Unable to load services",
          tone: "danger",
        });
      })
      .finally(() => {
        if (active) setServicesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dialog]);

  const update = <K extends keyof ManualOrderDraft>(
    key: K,
    value: ManualOrderDraft[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const toggleService = (id: string) => {
    setDraft((current) => ({
      ...current,
      selectedServiceIds: current.selectedServiceIds.includes(id)
        ? current.selectedServiceIds.filter((serviceId) => serviceId !== id)
        : [...current.selectedServiceIds, id],
    }));
    setErrors((current) => ({ ...current, services: undefined }));
  };

  const validate = () => {
    const normalizedPhone = draft.phone.replace(/[\s-]/g, "");
    const nextErrors: FormErrors = {
      address:
        draft.method === "pickupDelivery" && !draft.address.trim()
          ? "Address is required for pickup and delivery orders."
          : undefined,
      customerName: draft.customerName.trim()
        ? undefined
        : "Customer name is required.",
      phone: /^(09\d{9}|\+639\d{9})$/.test(normalizedPhone)
        ? undefined
        : "Enter a valid Philippine mobile number.",
      schedule:
        !draft.scheduleLabel.trim() || draft.scheduleLabel === "Custom · "
          ? "Select a valid schedule."
          : undefined,
      services:
        draft.selectedServiceIds.length > 0
          ? undefined
          : "Select at least one service.",
    };
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const submit = async (allowDuplicate = false) => {
    if (submitting || !validate()) return;
    setSubmitting(true);
    try {
      const order = await createManualOrder(draft, { allowDuplicate });
      if (Platform.OS === "android") {
        ToastAndroid.show("Order created successfully.", ToastAndroid.SHORT);
      }
      onCreated(order);
    } catch (error) {
      if (error instanceof PossibleDuplicateOrderError) {
        // The customer already has an open job for this day. Let the owner see
        // the existing order code and decide, instead of silently creating a
        // second record for the same laundry.
        const createAnyway = await dialog.confirm({
          bullets: [`${draft.customerName.trim()} · ${draft.phone.trim()}`],
          cancelLabel: "Go Back",
          confirmLabel: "Create Anyway",
          message: error.message,
          title: "Possible duplicate order",
          tone: "warning",
        });
        setSubmitting(false);
        if (createAnyway) await submit(true);
        return;
      }

      await dialog.notify({
        message: describeApiError(error, "Please try again."),
        title: "Unable to create order",
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const applyAdjustments = (adjustments: ChargeAdjustments) => {
    setDraft((current) => ({ ...current, ...adjustments }));
    setAdjustmentsVisible(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ManualOrderPageHeader
        horizontalPadding={pagePadding}
        onBackPress={onCancel}
        onProfilePress={() => navigation.navigate("Settings")}
        safeAreaTop={insets.top}
        subtitle="Create a quick laundry order."
        title="New Order"
        width={width}
      />
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: 112 + Math.max(insets.bottom, 12),
            paddingHorizontal: pagePadding,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CustomerSection
          compact={compact}
          customerName={draft.customerName}
          errors={errors}
          onChangeName={(value) => update("customerName", value)}
          onChangePhone={(value) => update("phone", value)}
          phone={draft.phone}
        />
        <OrderMethodSelector
          onChange={(method) => update("method", method)}
          value={draft.method}
        />
        <ManualServiceSelector
          error={errors.services}
          loading={servicesLoading}
          onToggle={toggleService}
          selectedIds={draft.selectedServiceIds}
          services={services}
        />
        <OrderDetailsSection
          address={draft.address}
          addressError={errors.address}
          loadCount={draft.loadCount}
          method={draft.method}
          onAddressChange={(value) => update("address", value)}
          onLoadCountChange={(value) => update("loadCount", value)}
          onPaymentChange={(value) => update("paymentMethod", value)}
          onScheduleChange={(value) => update("scheduleLabel", value)}
          paymentMethod={draft.paymentMethod}
          scheduleError={errors.schedule}
          scheduleLabel={draft.scheduleLabel}
        />
        <OrderSummaryCard
          additionalCharge={draft.additionalCharge}
          deliveryFee={calculation.deliveryFee}
          discount={draft.discount}
          onAdjustPress={() => setAdjustmentsVisible(true)}
          serviceAmount={calculation.serviceAmount}
          totalAmount={calculation.totalAmount}
        />
        <OptionalDetailsAccordion
          email={draft.email}
          notes={draft.notes}
          notification={draft.preferredNotificationChannel}
          onEmailChange={(value) => update("email", value)}
          onNotesChange={(value) => update("notes", value)}
          onNotificationChange={(value) =>
            update("preferredNotificationChannel", value)
          }
          onSpecialInstructionsChange={(value) =>
            update("specialInstructions", value)
          }
          specialInstructions={draft.specialInstructions}
        />
      </ScrollView>
      <View
        style={[
          styles.actionBar,
          compact && styles.compactActionBar,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            paddingHorizontal: pagePadding,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          onPress={onCancel}
          style={({ pressed }) => [
            styles.cancelButton,
            compact && styles.compactActionButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            busy: submitting,
            disabled: submitting || servicesLoading || services.length === 0,
          }}
          disabled={submitting || servicesLoading || services.length === 0}
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.createButton,
            compact && styles.compactActionButton,
            submitting && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={colors.surface} size="small" />
          ) : null}
          <Text style={styles.createText}>
            {submitting ? "Creating…" : "Create Order"}
          </Text>
        </Pressable>
      </View>
      {adjustmentsVisible ? (
        <AdjustChargesSheet
          additionalCharge={draft.additionalCharge}
          additionalChargeReason={draft.additionalChargeReason}
          discount={draft.discount}
          discountReason={draft.discountReason}
          loadCount={draft.loadCount}
          onApply={applyAdjustments}
          onClose={() => setAdjustmentsVisible(false)}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    left: 0,
    paddingTop: 10,
    position: "absolute",
    right: 0,
  },
  cancelButton: {
    alignItems: "center",
    borderColor: colors.navy,
    borderRadius: 13,
    borderWidth: 1,
    flex: 1,
    height: 50,
    justifyContent: "center",
  },
  cancelText: { color: colors.navy, fontSize: 14, fontWeight: "700" },
  content: { gap: 12, paddingTop: 16 },
  compactActionBar: { gap: 8, paddingTop: 8 },
  compactActionButton: { height: 46 },
  createButton: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 13,
    flex: 1.45,
    flexDirection: "row",
    gap: 8,
    height: 50,
    justifyContent: "center",
  },
  createText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.58 },
  pressed: { opacity: 0.75 },
  screen: { backgroundColor: colors.background, flex: 1 },
});
