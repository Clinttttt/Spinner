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
  deliveryFee: number;
  additionalCharge: number;
  additionalChargeReason: string;
  discount: number;
  discountReason: string;
  notes: string;
  specialInstructions: string;
  preferredNotificationChannel: PreferredNotificationChannel;
}

export type ManualOrdersViewState = "loading" | "ready" | "error";
