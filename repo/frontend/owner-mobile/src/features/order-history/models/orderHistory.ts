import type { PaymentStatus } from "../../bookings/models/booking";

/** Where the order came from: the customer site or typed in at the counter. */
export type OrderHistorySource = "booking" | "manual";

/** One service on an order, as the customer chose it. */
export interface OrderHistoryServiceLine {
  quantity: number;
  serviceName: string;
  subtotal: number;
  unitLabel: string;
  unitPrice: number;
}

export interface OrderHistoryEntry {
  additionalNotes?: string;
  address?: string;
  amount: number;
  createdAt: string;
  customerName: string;
  deliveryFee: number;
  fulfillmentLabel: string;
  loadCount: number;
  mobileNumber: string;
  orderCode: string;
  orderId: string;
  paidAt?: string;
  paymentLabel: string;
  paymentStatus: PaymentStatus;
  preferredDate: string;
  receiptCode?: string;
  scheduleLabel: string;
  serviceAmount: number;
  /** Every service on the order. Falls back to the single name when none are recorded. */
  serviceLines: OrderHistoryServiceLine[];
  serviceName: string;
  source: OrderHistorySource;
  /** Reads as the owner would say it: Completed, Cancelled, In Process. */
  statusLabel: string;
  trackingCode?: string;
  updatedAt: string;
}

export type OrderHistoryFilter = "all" | "completed" | "cancelled" | "unpaid";

export type OrderHistoryViewState = "loading" | "ready" | "empty" | "error";
