export type ManualOrderMethod = "walkIn" | "dropOff" | "pickupDelivery";

export type ManualOrderStatus =
  "created" | "confirmed" | "inProcess" | "ready" | "completed" | "cancelled";

export type ManualOrderApiStatus =
  | "BookingReceived"
  | "Confirmed"
  | "PickedUp"
  | "BeingProcessed"
  | "ReadyForDelivery"
  | "Completed"
  | "Rejected";

export type ManualPaymentMethod = "cash" | "qrOnline";

export type ManualPaymentStatus =
  "unpaid" | "waitingOnline" | "paid" | "failed" | "refunded";

export type ManualOrderFilter =
  "all" | "walkIn" | "dropOff" | "pickupDelivery" | "inProcess" | "completed";

export type PreferredNotificationChannel = "sms" | "email" | "both" | "none";

export interface ManualOrderServiceItem {
  serviceId: string;
  name: string;
  unitPrice: number;
  unitLabel: string;
  quantity: number;
  subtotal: number;
}

export interface ManualOrder {
  id: string;
  orderCode: string;
  apiStatus: ManualOrderApiStatus;
  source: "ownerManual";
  customerId?: string;
  customerName: string;
  phone: string;
  email?: string;
  method: ManualOrderMethod;
  address?: string;
  scheduleLabel: string;
  scheduledAt: string;
  status: ManualOrderStatus;
  paymentMethod: ManualPaymentMethod;
  paymentStatus: ManualPaymentStatus;
  services: ManualOrderServiceItem[];
  deliveryFee: number;
  additionalCharge: number;
  additionalChargeReason?: string;
  discount: number;
  discountReason?: string;
  totalAmount: number;
  notes?: string;
  specialInstructions?: string;
  preferredNotificationChannel: PreferredNotificationChannel;
  createdAt: string;
}

export interface ManualServiceOption {
  id: string;
  name: string;
  price: number;
  unitLabel: string;
  /**
   * Whether this service can be collected and returned.
   *
   * Independent of the fee: a service can be offered for pickup with no fee configured. The
   * API refuses a Pickup & Delivery order containing a service without this, so the New Order
   * screen has to know before the order is sent rather than finding out from the refusal.
   */
  supportsPickupAndDelivery: boolean;
  /**
   * What this service charges for a pickup and delivery trip, as configured in Settings.
   * Null when no fee is set.
   */
  deliveryFee: number | null;
}

export interface ManualOrderDraft {
  customerName: string;
  phone: string;
  email: string;
  method: ManualOrderMethod;
  address: string;
  scheduleLabel: string;
  paymentMethod: ManualPaymentMethod;
  selectedServiceIds: string[];
  loadCount: number;
  additionalCharge: number;
  additionalChargeReason: string;
  discount: number;
  discountReason: string;
  notes: string;
  specialInstructions: string;
  preferredNotificationChannel: PreferredNotificationChannel;
}

export type ManualOrdersViewState = "loading" | "ready" | "error";
