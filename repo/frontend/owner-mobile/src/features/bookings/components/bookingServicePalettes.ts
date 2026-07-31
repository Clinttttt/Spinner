export type BookingServicePaletteVariant = "single" | "multiple";

export const bookingServicePalettes = {
  single: {
    background: "#ECF8EF",
    border: "#D6EEDC",
    icon: "#1F8A4C",
    text: "#176B3A",
  },
  multiple: {
    background: "#F4F0FF",
    border: "#E4DAFF",
    icon: "#4F2CA8",
    text: "#3F247F",
  },
} as const;

export function getBookingServicePaletteVariant(
  serviceCount: number,
): BookingServicePaletteVariant {
  return serviceCount === 1 ? "single" : "multiple";
}
