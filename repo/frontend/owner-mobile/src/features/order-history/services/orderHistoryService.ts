import { apiRequest } from "../../../api/apiClient";
import { type PagedResponse, withPage } from "../../../api/pagination";
import type {
  OrderHistoryEntry,
  OrderHistoryFilter,
  OrderHistorySource,
} from "../models/orderHistory";
import type { PaymentStatus } from "../../bookings/models/booking";

interface OrderHistoryDto {
  orderId: string;
  orderCode: string;
  source: string;
  customerName: string;
  mobileNumber: string;
  serviceName: string;
  preferredDate: string;
  preferredTimeWindow: string;
  fulfillmentType: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  address?: string;
  trackingCode?: string;
  additionalNotes?: string;
  loadCount?: number;
  serviceAmount?: number;
  deliveryFee?: number;
  receiptCode?: string;
  paidAt?: string;
  serviceLines?: {
    serviceName: string;
    unitLabel: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

/**
 * Rows per request.
 *
 * The report endpoint is paged, so history is read a screenful at a time rather than
 * pulled down in full the way the reporting aggregates do it.
 */
const PAGE_SIZE = 25;

function statusLabel(status: string) {
  if (status === "BookingReceived") return "New";
  if (status === "Confirmed") return "Confirmed";
  if (status === "PickedUp") return "Picked Up";
  if (status === "BeingProcessed") return "In Process";
  if (status === "ReadyForDelivery") return "Ready";
  if (status === "Completed") return "Completed";
  // Rejected covers both a turned-down booking and a cancelled order.
  return "Cancelled";
}

function paymentStatus(dto: OrderHistoryDto): PaymentStatus {
  if (dto.paymentStatus === "Paid") return "paid";
  return dto.paymentMethod === "CashOnDelivery" ? "cod" : "unpaid";
}

function paymentLabel(dto: OrderHistoryDto) {
  if (dto.paymentStatus === "Paid") {
    return dto.paymentMethod === "CashOnDelivery"
      ? "Paid in cash"
      : "Paid online";
  }

  return dto.paymentMethod === "CashOnDelivery" ? "Cash on delivery" : "Unpaid";
}

function fulfillmentLabel(value: string) {
  if (value === "PickupAndDelivery") return "Pickup & delivery";
  if (value === "Delivery") return "Delivery";
  return "Drop-off";
}

function scheduleLabel(dto: OrderHistoryDto) {
  const date = new Date(`${dto.preferredDate}T00:00:00`);
  const day = Number.isNaN(date.getTime())
    ? dto.preferredDate
    : date.toLocaleDateString("en-PH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  return dto.preferredTimeWindow ? `${day} · ${dto.preferredTimeWindow}` : day;
}

function source(value: string): OrderHistorySource {
  return value === "OwnerManual" ? "manual" : "booking";
}

function mapEntry(dto: OrderHistoryDto): OrderHistoryEntry {
  return {
    amount: dto.totalAmount,
    createdAt: dto.createdAt,
    customerName: dto.customerName,
    fulfillmentLabel: fulfillmentLabel(dto.fulfillmentType),
    mobileNumber: dto.mobileNumber,
    orderCode: dto.orderCode,
    orderId: dto.orderId,
    paymentLabel: paymentLabel(dto),
    paymentStatus: paymentStatus(dto),
    preferredDate: dto.preferredDate,
    scheduleLabel: scheduleLabel(dto),
    serviceName: dto.serviceName,
    additionalNotes: dto.additionalNotes ?? undefined,
    address: dto.address ?? undefined,
    deliveryFee: dto.deliveryFee ?? 0,
    loadCount: dto.loadCount ?? 0,
    paidAt: dto.paidAt ?? undefined,
    receiptCode: dto.receiptCode ?? undefined,
    serviceAmount: dto.serviceAmount ?? 0,
    // Falls back to the single stored name, so an older order still reads sensibly.
    serviceLines: dto.serviceLines?.length
      ? dto.serviceLines
      : [
          {
            quantity: dto.loadCount ?? 1,
            serviceName: dto.serviceName,
            subtotal: dto.serviceAmount ?? dto.totalAmount,
            unitLabel: "load",
            unitPrice: 0,
          },
        ],
    source: source(dto.source),
    trackingCode: dto.trackingCode ?? undefined,
    statusLabel: statusLabel(dto.status),
    updatedAt: dto.updatedAt,
  };
}

/**
 * Whether an entry belongs in the chosen filter.
 *
 * Applied here rather than sent to the server because the report endpoint filters by
 * date and text only. The set being filtered is one page, so this is not the kind of
 * client-side filtering that was removed from transaction history.
 */
export function matchesOrderHistoryFilter(
  entry: OrderHistoryEntry,
  filter: OrderHistoryFilter,
) {
  if (filter === "completed") return entry.statusLabel === "Completed";
  if (filter === "cancelled") return entry.statusLabel === "Cancelled";
  if (filter === "unpaid") return entry.paymentStatus !== "paid";
  return true;
}

export async function getOrderHistoryPage(input: {
  page: number;
  search: string;
}) {
  const params = new URLSearchParams();
  const search = input.search.trim();
  if (search) params.set("search", search);

  const query = params.toString();
  const path = query
    ? `/api/reports/order-history?${query}`
    : "/api/reports/order-history";

  const response = await apiRequest<PagedResponse<OrderHistoryDto>>(
    withPage(path, input.page, PAGE_SIZE),
  );

  return {
    entries: response.items.map(mapEntry),
    hasNextPage: response.hasNextPage,
    totalCount: response.totalCount,
  };
}
