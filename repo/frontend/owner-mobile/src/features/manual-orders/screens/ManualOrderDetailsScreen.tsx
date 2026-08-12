import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useEffect, useMemo, useState } from "react";
import { Linking } from "react-native";

import { describeApiError } from "../../../api/apiClient";
import { useDialog } from "../../../components/common/DialogProvider";
import type { RootTabParamList } from "../../../navigation/types";
import { BookingActionsCard } from "../../bookings/components/BookingActionsCard";
import { BookingCustomerNotesCard } from "../../bookings/components/BookingCustomerNotesCard";
import {
  BookingDetailsLayout,
  BookingDetailsSupportRow,
} from "../../bookings/components/BookingDetailsLayout";
import { BookingServicesCard } from "../../bookings/components/BookingServicesCard";
import { BookingSummaryCard } from "../../bookings/components/BookingSummaryCard";
import type {
  BookingStatus,
  PaymentStatus,
} from "../../bookings/models/booking";
import type {
  BookingDetails,
  BookingServiceType,
} from "../../bookings/models/bookingDetails";
import type { ManualOrder, ManualOrderStatus } from "../models/manualOrder";
import {
  advanceManualOrder,
  clearManualOrder,
  getManualOrderDetails,
  manualOrderAction,
  methodLabel,
} from "../services/manualOrdersService";

function peso(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

interface ManualOrderDetailsScreenProps {
  navigation: BottomTabNavigationProp<RootTabParamList, "ManualOrders">;
  onBackPress: () => void;
  onOrderUpdated: (order: ManualOrder) => void;
  order: ManualOrder;
}

function bookingStatus(status: ManualOrderStatus): BookingStatus {
  if (status === "created") return "new";
  // See ManualOrderCard: cancelled used to be reported as completed.
  return status;
}

function paymentStatus(order: ManualOrder): PaymentStatus {
  return order.paymentStatus === "paid" ? "paid" : "unpaid";
}

function serviceType(serviceId: string): BookingServiceType {
  if (serviceId === "dry-only") return "dryOnly";
  if (serviceId === "self-service") return "selfService";
  return "washFold";
}

export function ManualOrderDetailsScreen({
  navigation,
  onBackPress,
  onOrderUpdated,
  order,
}: ManualOrderDetailsScreenProps) {
  const dialog = useDialog();
  const [currentOrder, setCurrentOrder] = useState(order);
  const [submitting, setSubmitting] = useState(false);
  const primaryAction = manualOrderAction(currentOrder);

  useEffect(() => {
    getManualOrderDetails(order.id)
      .then((details) => {
        setCurrentOrder(details);
        onOrderUpdated(details);
      })
      .catch(() => undefined);
  }, [onOrderUpdated, order.id]);

  const displayOrder = useMemo<BookingDetails>(
    () => ({
      address:
        currentOrder.address ??
        `${methodLabel(currentOrder.method)} order · No customer address required`,
      bookingCode: currentOrder.orderCode,
      bookingStatus: bookingStatus(currentOrder.status),
      customerName: currentOrder.customerName,
      customerPhone: currentOrder.phone,
      id: currentOrder.id,
      note: [currentOrder.notes, currentOrder.specialInstructions]
        .filter(Boolean)
        .join("\n"),
      paymentMethodLabel:
        currentOrder.paymentMethod === "cash"
          ? currentOrder.method === "pickupDelivery"
            ? "Cash on Delivery"
            : "Cash / Pay on Claim"
          : "QR Code Online Payment",
      paymentStatus: paymentStatus(currentOrder),
      scheduleLabel: currentOrder.scheduleLabel,
      services: currentOrder.services.map((service) => ({
        amount: service.subtotal,
        id: service.serviceId,
        name: service.name,
        subtitle: `${service.quantity} ${service.unitLabel.replace("per ", "")} · ₱${service.unitPrice.toFixed(2)} each`,
        type: serviceType(service.serviceId),
      })),
      totalAmount: currentOrder.totalAmount,
    }),
    [currentOrder],
  );

  const updateStatus = async () => {
    if (submitting || primaryAction.disabled) return;
    setSubmitting(true);
    try {
      const updated = await advanceManualOrder(currentOrder);
      setCurrentOrder(updated);
      onOrderUpdated(updated);
    } catch (error) {
      await dialog.notify({
        message: describeApiError(error, "Please try again."),
        title: "Unable to update order",
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (
      currentOrder.status === "ready" &&
      currentOrder.paymentStatus === "unpaid"
    ) {
      const accepted = await dialog.confirm({
        bullets: [
          `${currentOrder.customerName} · ${currentOrder.orderCode}`,
          `Amount due ${peso(currentOrder.totalAmount)}`,
        ],
        confirmLabel: "Confirm Payment",
        message:
          "Only continue after the full cash payment has been collected. This marks the order paid and issues the receipt.",
        title: "Confirm cash payment",
      });
      if (!accepted) return;
    }

    await updateStatus();
  };

  const handleClear = async () => {
    const accepted = await dialog.confirm({
      bullets: [`${currentOrder.orderCode} · ${currentOrder.customerName}`],
      confirmLabel: "Clear",
      message:
        "This finished order is removed from the active list. Sales, receipts, and history keep the record.",
      title: "Clear this order?",
      tone: "warning",
    });
    if (!accepted) return;

    try {
      await clearManualOrder(currentOrder.id);
      onBackPress();
    } catch (error) {
      await dialog.notify({
        message: describeApiError(error, "Please try again."),
        title: "Unable to clear order",
        tone: "danger",
      });
    }
  };

  return (
    <BookingDetailsLayout
      bookingCode={currentOrder.orderCode}
      onBackPress={onBackPress}
      onProfilePress={() => navigation.navigate("Settings")}
      title="Order Details"
    >
      <BookingSummaryCard
        booking={displayOrder}
        onCallPress={() => void Linking.openURL(`tel:${currentOrder.phone}`)}
      />
      <BookingServicesCard booking={displayOrder} />
      <BookingCustomerNotesCard note={displayOrder.note || undefined} />
      <BookingActionsCard
        onClearPress={
          currentOrder.apiStatus === "Completed" ||
          currentOrder.apiStatus === "Rejected"
            ? () => void handleClear()
            : undefined
        }
        onMessagePress={() => void Linking.openURL(`sms:${currentOrder.phone}`)}
        onPrimaryPress={() => void handlePrimaryAction()}
        primaryDisabled={primaryAction.disabled || submitting}
        primaryLoading={submitting}
        primaryLabel={submitting ? "Updating…" : primaryAction.label}
      />
      <BookingDetailsSupportRow />
    </BookingDetailsLayout>
  );
}
