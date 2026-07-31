import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import type {
  BookingDetails,
  BookingServiceItem,
  BookingServiceType,
} from "../models/bookingDetails";
import {
  bookingDetailsCardStyle,
  bookingDetailsColors,
  getBookingDetailsServicePalette,
} from "./bookingDetailsTheme";

interface BookingServicesCardProps {
  booking: BookingDetails;
}

const serviceVisuals: Record<
  BookingServiceType,
  {
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  washFold: { icon: "shirt-outline" },
  dryOnly: { icon: "shirt-outline" },
  dropOff: { icon: "water-outline" },
  pickup: { icon: "car-outline" },
  delivery: { icon: "bicycle-outline" },
  selfService: { icon: "water-outline" },
};

function formatCurrency(amount: number) {
  return `₱${amount.toFixed(2)}`;
}

function ServiceAmountRow({ service }: { service: BookingServiceItem }) {
  const visual = serviceVisuals[service.type];
  const palette = getBookingDetailsServicePalette(service.type);

  return (
    <View style={styles.serviceRow}>
      <View
        style={[
          styles.serviceIcon,
          {
            backgroundColor: palette.background,
            borderColor: palette.border,
          },
        ]}
      >
        <Ionicons color={palette.icon} name={visual.icon} size={24} />
      </View>
      <View style={styles.serviceCopy}>
        <Text numberOfLines={1} style={styles.serviceName}>
          {service.name}
        </Text>
        <Text numberOfLines={2} style={styles.serviceSubtitle}>
          {service.subtitle}
        </Text>
      </View>
      <Text style={styles.serviceAmount}>{formatCurrency(service.amount)}</Text>
    </View>
  );
}

export function BookingServicesCard({ booking }: BookingServicesCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Services</Text>
      <View style={styles.services}>
        {booking.services.map((service) => (
          <ServiceAmountRow key={service.id} service={service} />
        ))}
      </View>

      <View style={styles.divider} />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.totalAmount}>
          {formatCurrency(booking.totalAmount)}
        </Text>
      </View>

      <View style={styles.paymentStrip}>
        <Ionicons
          color={bookingDetailsColors.textPrimary}
          name="wallet-outline"
          size={18}
        />
        <Text style={styles.paymentText}>
          Payment Method:{" "}
          <Text style={styles.paymentValue}>{booking.paymentMethodLabel}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...bookingDetailsCardStyle,
    padding: 18,
  },
  cardTitle: {
    color: bookingDetailsColors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
  },
  services: {
    gap: 14,
    marginTop: 15,
  },
  serviceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  serviceIcon: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  serviceCopy: {
    flex: 1,
    minWidth: 0,
  },
  serviceName: {
    color: bookingDetailsColors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
  },
  serviceSubtitle: {
    color: bookingDetailsColors.textSecondary,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    marginTop: 2,
  },
  serviceAmount: {
    color: bookingDetailsColors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    marginLeft: 8,
  },
  divider: {
    backgroundColor: bookingDetailsColors.border,
    height: StyleSheet.hairlineWidth,
    marginTop: 16,
  },
  totalRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 13,
  },
  totalLabel: {
    color: bookingDetailsColors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 19,
  },
  totalAmount: {
    color: bookingDetailsColors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
  },
  paymentStrip: {
    alignItems: "center",
    backgroundColor: bookingDetailsColors.surface,
    borderColor: bookingDetailsColors.controlBorder,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 9,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  paymentText: {
    color: bookingDetailsColors.textPrimary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  paymentValue: {
    fontWeight: "500",
  },
});
