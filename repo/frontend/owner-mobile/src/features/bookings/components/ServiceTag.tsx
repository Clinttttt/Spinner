import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import type { BookingService } from "../models/booking";
import {
  bookingServicePalettes,
  getBookingServicePaletteVariant,
} from "./bookingServicePalettes";

interface ServiceTagProps {
  service: BookingService;
  serviceCount: number;
}

const serviceConfig: Record<
  BookingService,
  {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  pickup: {
    icon: "car-outline",
    label: "Pickup",
  },
  dropOff: {
    icon: "bag-handle-outline",
    label: "Drop-off",
  },
  delivery: {
    icon: "bicycle-outline",
    label: "Delivery",
  },
  washDryFold: {
    icon: "shirt-outline",
    label: "Wash/Dry/Fold",
  },
  dryOnly: {
    icon: "shirt-outline",
    label: "Dry Only",
  },
  selfService: {
    icon: "water-outline",
    label: "Self-Service",
  },
};

export function ServiceTag({ service, serviceCount }: ServiceTagProps) {
  const config = serviceConfig[service];
  const palette =
    bookingServicePalettes[getBookingServicePaletteVariant(serviceCount)];

  return (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
      ]}
    >
      <Ionicons color={palette.icon} name={config.icon} size={15} />
      <Text style={[styles.text, { color: palette.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignItems: "center",
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
  },
  text: {
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 15,
  },
});
