import type { ManualOrderDraft } from "../models/manualOrder";

export const defaultManualOrderDraft: ManualOrderDraft = {
  customerName: "",
  phone: "",
  email: "",
  method: "walkIn",
  address: "",
  scheduleLabel: "Today · Current time",
  paymentMethod: "cash",
  selectedServiceIds: [],
  loadCount: 1,
  deliveryFee: 0,
  additionalCharge: 0,
  additionalChargeReason: "",
  discount: 0,
  discountReason: "",
  notes: "",
  specialInstructions: "",
  preferredNotificationChannel: "sms",
};
