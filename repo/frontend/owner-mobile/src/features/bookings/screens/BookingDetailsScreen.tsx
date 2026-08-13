import { useCallback, useEffect, useState } from "react";
import { Linking, Platform, ToastAndroid } from "react-native";

import { describeApiError } from "../../../api/apiClient";
import { useDialog } from "../../../components/common/DialogProvider";
import type {
  BookingDetails,
  BookingDetailsViewState,
} from "../models/bookingDetails";
import { BookingActionsCard } from "../components/BookingActionsCard";
import { BookingCustomerNotesCard } from "../components/BookingCustomerNotesCard";
import {
  BookingDetailsLayout,
  BookingDetailsSupportRow,
} from "../components/BookingDetailsLayout";
import { BookingDetailsSkeleton } from "../components/BookingDetailsSkeleton";
import { BookingDetailsStateCard } from "../components/BookingDetailsStateCard";
import { BookingServicesCard } from "../components/BookingServicesCard";
import { BookingSummaryCard } from "../components/BookingSummaryCard";
import {
  advanceBookingStatus,
  bookingActionLabel,
  clearBooking,
  getBookingDetails,
  isBookingActionDisabled,
} from "../services/bookingsService";

function peso(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

interface BookingDetailsScreenProps {
  bookingId: string;
  onBackPress: () => void;
  /** Opens the Help Center. Provided by the flow screen, which owns navigation. */
  onContactSupport: () => void;
  onProfilePress: () => void;
}

export function BookingDetailsScreen({
  bookingId,
  onBackPress,
  onContactSupport,
  onProfilePress,
}: BookingDetailsScreenProps) {
  const dialog = useDialog();
  const [viewState, setViewState] =
    useState<BookingDetailsViewState>("loading");
  const [displayBooking, setDisplayBooking] = useState<BookingDetails>();
  const [submitting, setSubmitting] = useState(false);

  const loadDetails = useCallback(async () => {
    try {
      setDisplayBooking(await getBookingDetails(bookingId));
      setViewState("ready");
    } catch {
      setDisplayBooking(undefined);
      setViewState("error");
    }
  }, [bookingId]);

  useEffect(() => {
    let active = true;
    getBookingDetails(bookingId)
      .then((booking) => {
        if (!active) return;
        setDisplayBooking(booking);
        setViewState("ready");
      })
      .catch(() => {
        if (!active) return;
        setDisplayBooking(undefined);
        setViewState("error");
      });
    return () => {
      active = false;
    };
  }, [bookingId]);

  const handleRetry = useCallback(() => {
    setViewState("loading");
    void loadDetails();
  }, [loadDetails]);

  const handleCall = useCallback(() => {
    if (displayBooking?.customerPhone) {
      void Linking.openURL(`tel:${displayBooking.customerPhone}`);
    }
  }, [displayBooking]);

  const handleMessage = useCallback(() => {
    if (displayBooking?.customerPhone) {
      void Linking.openURL(`sms:${displayBooking.customerPhone}`);
    }
  }, [displayBooking]);

  /**
   * What just happened, in the owner's words.
   *
   * The primary action used to succeed in silence. Confirming a cash payment records the
   * money and issues the receipt but deliberately leaves the order Ready for Delivery,
   * because collecting payment and closing the job are separate facts — so the button then
   * reads "Mark Completed" and needs pressing again. With no acknowledgement of the first
   * press, that reads as a button that ignored you, and the natural response is to press it
   * again rather than to notice the label changed.
   */
  const describeAction = (before: BookingDetails) => {
    if (
      before.apiStatus === "ReadyForDelivery" &&
      before.paymentStatus === "cod"
    ) {
      return "Cash payment recorded and receipt issued. Mark it completed when it is handed over.";
    }

    if (before.apiStatus === "BookingReceived") return "Booking confirmed.";

    if (
      before.apiStatus === "Confirmed" &&
      before.fulfillmentType === "PickupAndDelivery"
    ) {
      return "Marked picked up.";
    }

    if (before.apiStatus === "Confirmed" || before.apiStatus === "PickedUp") {
      return "Processing started.";
    }

    if (before.apiStatus === "BeingProcessed") return "Marked ready.";
    if (before.apiStatus === "ReadyForDelivery") return "Order completed.";

    return "Order updated.";
  };

  const performPrimaryAction = useCallback(async () => {
    if (!displayBooking || submitting) return;

    // Captured before the call, because the refetch replaces it and the message describes
    // the step that was taken, not the state it landed in.
    const before = displayBooking;

    setSubmitting(true);
    try {
      const updated = await advanceBookingStatus(before);
      if (updated) setDisplayBooking(updated);

      const message = describeAction(before);

      if (Platform.OS === "android") {
        ToastAndroid.show(message, ToastAndroid.LONG);
      } else {
        await dialog.notify({
          message,
          title: "Order updated",
          tone: "success",
        });
      }
    } catch (error) {
      await dialog.notify({
        message: describeApiError(error, "Please try again."),
        title: "Unable to update order",
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }, [dialog, displayBooking, submitting]);

  const handlePrimaryAction = useCallback(async () => {
    if (!displayBooking || submitting) return;

    if (
      displayBooking.apiStatus === "ReadyForDelivery" &&
      displayBooking.paymentStatus === "cod"
    ) {
      const accepted = await dialog.confirm({
        bullets: [
          `${displayBooking.customerName} · ${displayBooking.bookingCode}`,
          `Amount due ${peso(displayBooking.totalAmount)}`,
        ],
        confirmLabel: "Confirm Payment",
        message:
          "Only continue after the full cash payment has been collected. This marks the order paid and issues the receipt.",
        title: "Confirm cash payment",
      });
      if (!accepted) return;
    }

    await performPrimaryAction();
  }, [dialog, displayBooking, performPrimaryAction, submitting]);

  const handleClear = useCallback(async () => {
    if (!displayBooking) return;

    const accepted = await dialog.confirm({
      bullets: [
        `${displayBooking.bookingCode} · ${displayBooking.customerName}`,
      ],
      confirmLabel: "Clear",
      message:
        "This finished booking is removed from the active list. Sales, receipts, and history keep the record.",
      title: "Clear this booking?",
      tone: "warning",
    });
    if (!accepted) return;

    try {
      await clearBooking(displayBooking.id);
      onBackPress();
    } catch (error) {
      await dialog.notify({
        message: describeApiError(error, "Please try again."),
        title: "Unable to clear booking",
        tone: "danger",
      });
    }
  }, [dialog, displayBooking, onBackPress]);

  return (
    <BookingDetailsLayout
      bookingCode={displayBooking?.bookingCode}
      onBackPress={onBackPress}
      onProfilePress={onProfilePress}
    >
      {viewState === "loading" ? <BookingDetailsSkeleton /> : null}

      {viewState === "error" ? (
        <BookingDetailsStateCard
          actionLabel="Retry"
          kind="error"
          onActionPress={handleRetry}
        />
      ) : null}

      {viewState === "ready" && !displayBooking ? (
        <BookingDetailsStateCard
          actionLabel="Back to Bookings"
          kind="notFound"
          onActionPress={onBackPress}
        />
      ) : null}

      {viewState === "ready" && displayBooking ? (
        <>
          <BookingSummaryCard
            booking={displayBooking}
            onCallPress={handleCall}
          />
          <BookingServicesCard booking={displayBooking} />
          <BookingCustomerNotesCard note={displayBooking.note} />
          <BookingActionsCard
            onClearPress={
              displayBooking.apiStatus === "Completed"
                ? () => void handleClear()
                : undefined
            }
            onMessagePress={handleMessage}
            onPrimaryPress={() => void handlePrimaryAction()}
            primaryDisabled={
              submitting || isBookingActionDisabled(displayBooking)
            }
            primaryLoading={submitting}
            primaryLabel={
              submitting ? "Updating…" : bookingActionLabel(displayBooking)
            }
          />
          <BookingDetailsSupportRow onContactSupport={onContactSupport} />
        </>
      ) : null}
    </BookingDetailsLayout>
  );
}
