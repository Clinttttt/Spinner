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
  additionalCharge: 0,
  additionalChargeReason: "",
  discount: 0,
  discountReason: "",
  notes: "",
  specialInstructions: "",
  // Email, because that is the only channel the shop can actually send on. This was
  // "sms", which queued a text that went nowhere. See OptionalDetailsAccordion.
  preferredNotificationChannel: "email",
};
