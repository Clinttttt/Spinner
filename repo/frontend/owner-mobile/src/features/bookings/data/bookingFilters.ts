import type { BookingAdvancedFilters } from "../models/booking";

export const defaultBookingAdvancedFilters: BookingAdvancedFilters = {
  service: "all",
  paymentStatus: "all",
  fulfillmentType: "all",
  dateBucket: "all",
};
