import type { BookingStatus, PaymentStatus } from "./booking";

export type BookingServiceType =
  "washFold" | "dryOnly" | "dropOff" | "pickup" | "delivery" | "selfService";

export interface BookingServiceItem {
  id: string;
  type: BookingServiceType;
  name: string;
  subtitle: string;
  amount: number;
}

export interface BookingDetails {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone?: string;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  scheduleLabel: string;
  address: string;
  note?: string;
  paymentMethodLabel: string;
  totalAmount: number;
  services: BookingServiceItem[];
  apiStatus?: string;
  fulfillmentType?: string;
}

export type BookingDetailsViewState = "loading" | "ready" | "error";
