import type { PaymentStatus } from "../../bookings/models/booking";

/** Where the order came from: the customer site or typed in at the counter. */
export type OrderHistorySource = "booking" | "manual";

export interface OrderHistoryEntry {
  amount: number;
  createdAt: string;
  customerName: string;
  fulfillmentLabel: string;
  mobileNumber: string;
  orderCode: string;
  orderId: string;
  paymentLabel: string;
  paymentStatus: PaymentStatus;
  preferredDate: string;
  scheduleLabel: string;
  serviceName: string;
  source: OrderHistorySource;
  /** Reads as the owner would say it: Completed, Cancelled, In Process. */
  statusLabel: string;
  updatedAt: string;
}

export type OrderHistoryFilter = "all" | "completed" | "cancelled" | "unpaid";

export type OrderHistoryViewState = "loading" | "ready" | "empty" | "error";
