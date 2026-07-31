export type BookingStatus =
  "new" | "confirmed" | "inProcess" | "ready" | "completed";

export type PaymentStatus = "cod" | "paid" | "unpaid";

export type FulfillmentType = "pickup" | "dropOff" | "delivery";

export type BookingDateBucket = "today" | "tomorrow";

export type BookingService =
  "pickup" | "dropOff" | "delivery" | "washDryFold" | "dryOnly" | "selfService";

export type AvatarTone = "blue" | "green" | "purple" | "gold";

export interface BookingListItem {
  id: string;
  bookingCode: string;
  /** Finished orders can be cleared from the active list. */
  canClear: boolean;
  customerName: string;
  phoneNumber?: string;
  scheduleLabel: string;
  address: string;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  fulfillmentType: FulfillmentType;
  dateBucket: BookingDateBucket;
  serviceTags: BookingService[];
  avatarTone: AvatarTone;
  sortOrder: number;
}

export type BookingStatusFilter = "all" | BookingStatus;

export type OptionalFilter<T extends string> = "all" | T;

export interface BookingAdvancedFilters {
  service: OptionalFilter<BookingService>;
  paymentStatus: OptionalFilter<PaymentStatus>;
  fulfillmentType: OptionalFilter<FulfillmentType>;
  dateBucket: OptionalFilter<BookingDateBucket>;
}

export type BookingsViewState = "loading" | "ready" | "error";
