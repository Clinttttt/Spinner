import type {
  PickupLocationSnapshot,
  PickupRoutePreview,
} from "./pickupLocation";

export type PickupFilter = "today" | "tomorrow" | "onRoute" | "completed";
export type PaymentStatus = "cod" | "paid" | "unpaid";
export type PickupStatus = "pending" | "onRoute" | "pickedUp";
export type PickupViewState = "loading" | "ready" | "error";
export type PickupServiceType = "pickup" | "washDryFold" | "selfService";

export interface PickupService {
  id: string;
  label: string;
  type: PickupServiceType;
}

/** One priced laundry line, as the customer booked it. */
export interface PickupServiceLine {
  name: string;
  quantity: number;
  subtotal: number;
  unitLabel: string;
  unitPrice: number;
}

export interface PickupTask {
  /** Free-text notes the customer left with the booking. */
  additionalNotes?: string;
  address: string;
  /** The customer has not confirmed the booking yet; it needs owner approval. */
  awaitingConfirmation: boolean;
  bookingCode: string;
  /** True when the order is finished and can be cleared from the list. */
  canClear: boolean;
  completedAt?: string;
  customerName: string;
  deliveryFee: number;
  filterBucket: PickupFilter;
  id: string;
  /** Total loads across every service line. */
  loadCount: number;
  location: PickupLocationSnapshot;
  /** Raw API order status, e.g. "Confirmed" or "Completed". */
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  phone?: string;
  pickupStatus: PickupStatus;
  routePreview?: PickupRoutePreview;
  scheduledAt: string;
  serviceAmount: number;
  /** Priced lines. Empty for older orders that predate itemised services. */
  serviceLines: PickupServiceLine[];
  services: PickupService[];
  timeLabel: string;
  totalAmount: number;
}
