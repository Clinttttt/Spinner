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

export interface PickupTask {
  address: string;
  /** The customer has not confirmed the booking yet; it needs owner approval. */
  awaitingConfirmation: boolean;
  bookingCode: string;
  /** True when the order is finished and can be cleared from the list. */
  canClear: boolean;
  completedAt?: string;
  customerName: string;
  filterBucket: PickupFilter;
  id: string;
  location: PickupLocationSnapshot;
  /** Raw API order status, e.g. "Confirmed" or "Completed". */
  orderStatus: string;
  paymentStatus: PaymentStatus;
  phone?: string;
  pickupStatus: PickupStatus;
  routePreview?: PickupRoutePreview;
  scheduledAt: string;
  services: PickupService[];
  timeLabel: string;
}
