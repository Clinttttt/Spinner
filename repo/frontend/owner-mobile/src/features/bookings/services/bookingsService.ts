import { apiRequest } from "../../../api/apiClient";
import { getAllPages } from "../../../api/pagination";
import type {
  AvatarTone,
  BookingListItem,
  BookingService,
  BookingStatus,
  FulfillmentType,
  PaymentStatus,
} from "../models/booking";
import type {
  BookingDetails,
  BookingServiceType,
} from "../models/bookingDetails";

interface BookingListDto {
  orderId: string;
  orderCode: string;
  customerName: string;
  mobileNumber: string;
  address: string;
  preferredDate: string;
  preferredTimeWindow: string;
  fulfillmentType: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  services: string[];
  totalAmount: number;
  createdAt: string;
}

interface OrderServiceDto {
  serviceId: string;
  name: string;
  unitLabel: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

interface OrderDetailsDto extends Omit<
  BookingListDto,
  "services" | "totalAmount"
> {
  additionalNotes?: string;
  specialInstructions?: string;
  estimatedTotalAmount: number;
  services: OrderServiceDto[];
}

const avatarTones: AvatarTone[] = ["blue", "green", "purple", "gold"];

function stableIndex(value: string, length: number) {
  return (
    [...value].reduce((total, char) => total + char.charCodeAt(0), 0) % length
  );
}

export function mapApiOrderStatus(status: string): BookingStatus {
  if (status === "BookingReceived") return "new";
  if (status === "Confirmed") return "confirmed";
  if (status === "PickedUp" || status === "BeingProcessed") return "inProcess";
  if (status === "ReadyForDelivery") return "ready";
  return "completed";
}

function paymentStatus(dto: {
  paymentMethod: string;
  paymentStatus: string;
}): PaymentStatus {
  if (dto.paymentStatus === "Paid") return "paid";
  return dto.paymentMethod === "CashOnDelivery" ? "cod" : "unpaid";
}

function fulfillmentType(value: string): FulfillmentType {
  if (value === "PickupAndDelivery") return "pickup";
  if (value === "Delivery") return "delivery";
  return "dropOff";
}

function serviceType(name: string): BookingService {
  const normalized = name.toLowerCase();
  if (normalized.includes("self")) return "selfService";
  if (normalized.includes("dry only")) return "dryOnly";
  if (normalized.includes("drop")) return "dropOff";
  if (normalized.includes("deliver")) return "delivery";
  if (normalized.includes("pickup")) return "pickup";
  return "washDryFold";
}

function detailsServiceType(name: string): BookingServiceType {
  const value = serviceType(name);
  if (value === "washDryFold") return "washFold";
  return value;
}

function dateBucket(date: string): "today" | "tomorrow" {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return target.getTime() === tomorrow.getTime() ? "tomorrow" : "today";
}

function dateLabel(date: string) {
  const bucket = dateBucket(date);
  return bucket === "tomorrow" ? "Tomorrow" : "Today";
}

function scheduleLabel(
  dto: Pick<BookingListDto, "preferredDate" | "preferredTimeWindow">,
) {
  return `${dateLabel(dto.preferredDate)} · ${dto.preferredTimeWindow}`;
}

function mapListItem(dto: BookingListDto, index: number): BookingListItem {
  const primaryFulfillment = fulfillmentType(dto.fulfillmentType);
  const tags = dto.services.map(serviceType);
  const fulfillmentTag: BookingService =
    primaryFulfillment === "pickup" ? "pickup" : "dropOff";

  return {
    address: dto.address,
    avatarTone: avatarTones[stableIndex(dto.orderId, avatarTones.length)],
    bookingCode: dto.orderCode,
    bookingStatus: mapApiOrderStatus(dto.status),
    canClear: dto.status === "Completed" || dto.status === "Rejected",
    // An unpaid order that is already under way cannot be completed (that needs
    // confirmed payment) and cannot be rejected (that only applies before
    // approval), so without this it would sit on the list with no action at all.
    // The usual case is a QR order the customer walked away from.
    canCancel:
      dto.status !== "Completed" &&
      dto.status !== "Rejected" &&
      dto.paymentStatus !== "Paid",
    customerName: dto.customerName,
    dateBucket: dateBucket(dto.preferredDate),
    fulfillmentType: primaryFulfillment,
    id: dto.orderId,
    paymentStatus: paymentStatus(dto),
    phoneNumber: dto.mobileNumber,
    scheduleLabel: scheduleLabel(dto),
    serviceTags: Array.from(new Set([fulfillmentTag, ...tags])),
    sortOrder: index,
  };
}

export async function getBookings(): Promise<BookingListItem[]> {
  const response = await getAllPages<BookingListDto>("/api/bookings");
  return response.map(mapListItem);
}

/**
 * Removes a finished booking from the active list. The order, receipt, sales
 * total, and history entry are all kept; only the work list is tidied.
 */
export async function clearBooking(bookingId: string) {
  await apiRequest(`/api/orders/${bookingId}/archive`, { method: "POST" });
}

/**
 * Cancels an order the shop will not fulfil and then clears it.
 *
 * Two calls rather than one because cancelling and clearing are separate
 * decisions everywhere else: cancel closes the job, clear tidies the list.
 * Clearing is safe to retry, so a failure between the two leaves the order
 * cancelled and still clearable.
 */
export async function cancelAndClearBooking(bookingId: string) {
  await apiRequest(`/api/orders/${bookingId}/cancel`, { method: "POST" });
  await apiRequest(`/api/orders/${bookingId}/archive`, { method: "POST" });
}

export async function getBookingDetails(id: string): Promise<BookingDetails> {
  const dto = await apiRequest<OrderDetailsDto>(`/api/orders/${id}`);
  return {
    address: dto.address,
    apiStatus: dto.status,
    bookingCode: dto.orderCode,
    bookingStatus: mapApiOrderStatus(dto.status),
    customerName: dto.customerName,
    customerPhone: dto.mobileNumber,
    fulfillmentType: dto.fulfillmentType,
    id: dto.orderId,
    note: [dto.additionalNotes, dto.specialInstructions]
      .filter(Boolean)
      .join("\n"),
    paymentMethodLabel:
      dto.paymentMethod === "QrCodeOnlinePayment"
        ? "QR Code Online Payment"
        : dto.fulfillmentType === "PickupAndDelivery"
          ? "Cash on Delivery"
          : "Cash / Pay on Claim",
    paymentStatus: paymentStatus(dto),
    scheduleLabel: scheduleLabel(dto),
    services: dto.services.map((service) => ({
      amount: service.subtotal,
      id: service.serviceId,
      name: service.name,
      subtitle: `${service.quantity} ${service.unitLabel.replace(/^per /i, "")} · ₱${service.unitPrice.toFixed(2)} each`,
      type: detailsServiceType(service.name),
    })),
    totalAmount: dto.estimatedTotalAmount,
  };
}

export async function advanceBookingStatus(booking: BookingDetails) {
  const status = booking.apiStatus;
  if (status === "ReadyForDelivery" && booking.paymentStatus === "cod") {
    await apiRequest(`/api/payments/${booking.id}/cod/confirm`, {
      method: "POST",
    });
  } else if (status === "BookingReceived") {
    await apiRequest(`/api/bookings/${booking.id}/confirm`, { method: "POST" });
  } else if (
    status === "Confirmed" &&
    booking.fulfillmentType === "PickupAndDelivery"
  ) {
    await apiRequest(`/api/pickups/${booking.id}/picked-up`, {
      method: "POST",
    });
  } else {
    const nextStatus: Record<string, string> = {
      Confirmed: "BeingProcessed",
      PickedUp: "BeingProcessed",
      BeingProcessed: "ReadyForDelivery",
      ReadyForDelivery: "Completed",
    };
    const next = status ? nextStatus[status] : undefined;
    if (!next) return;
    await apiRequest(`/api/orders/${booking.id}/status`, {
      body: { status: next },
      method: "POST",
    });
  }
  return getBookingDetails(booking.id);
}

export function bookingActionLabel(booking: BookingDetails) {
  if (booking.apiStatus === "BookingReceived") return "Confirm Order";
  if (
    booking.apiStatus === "Confirmed" &&
    booking.fulfillmentType === "PickupAndDelivery"
  ) {
    return "Mark Picked Up";
  }
  if (booking.apiStatus === "Confirmed" || booking.apiStatus === "PickedUp") {
    return "Start Processing";
  }
  if (booking.apiStatus === "BeingProcessed") return "Mark Ready";
  if (
    booking.apiStatus === "ReadyForDelivery" &&
    booking.paymentStatus === "unpaid"
  ) {
    return "Awaiting QR Payment";
  }
  if (
    booking.apiStatus === "ReadyForDelivery" &&
    booking.paymentStatus === "cod"
  ) {
    return "Confirm Cash Payment";
  }
  if (booking.apiStatus === "ReadyForDelivery") return "Mark Completed";
  return "Completed";
}

export function isBookingActionDisabled(booking: BookingDetails) {
  return (
    booking.apiStatus === "Completed" ||
    (booking.apiStatus === "ReadyForDelivery" &&
      booking.paymentStatus === "unpaid")
  );
}
