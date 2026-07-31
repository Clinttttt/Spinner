import { useCallback, useEffect, useState } from "react";
import { Linking } from "react-native";

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
  onProfilePress: () => void;
}

export function BookingDetailsScreen({
  bookingId,
  onBackPress,
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

  const performPrimaryAction = useCallback(async () => {
    if (!displayBooking || submitting) return;
    setSubmitting(true);
    try {
      const updated = await advanceBookingStatus(displayBooking);
      if (updated) setDisplayBooking(updated);
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
          <BookingDetailsSupportRow />
        </>
      ) : null}
    </BookingDetailsLayout>
  );
}
