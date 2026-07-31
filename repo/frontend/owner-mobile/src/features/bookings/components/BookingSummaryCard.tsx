import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import type { BookingDetails } from "../models/bookingDetails";
import { BookingBadge } from "./BookingBadge";
import { BookingStatusTracker } from "./BookingStatusTracker";
import {
  bookingDetailsCardStyle,
  bookingDetailsColors,
} from "./bookingDetailsTheme";

interface BookingSummaryCardProps {
  booking: BookingDetails;
  onCallPress: () => void;
}

export function BookingSummaryCard({
  booking,
  onCallPress,
}: BookingSummaryCardProps) {
  const { width } = useWindowDimensions();
  const compact = width <= 360;

  return (
    <View style={[styles.card, compact && styles.compactCard]}>
      <View style={[styles.topRow, compact && styles.compactTopRow]}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.avatar, compact && styles.compactAvatar]}
        >
          <Ionicons
            color={bookingDetailsColors.textPrimary}
            name="person-outline"
            size={compact ? 30 : 34}
          />
        </View>

        <View style={styles.customerCopy}>
          <Text
            numberOfLines={2}
            style={[styles.customerName, compact && styles.compactCustomerName]}
          >
            {booking.customerName}
          </Text>
          <View style={[styles.badges, compact && styles.compactBadges]}>
            <BookingBadge
              borderColor={bookingDetailsColors.borderStrong}
              value={booking.paymentStatus}
            />
            <BookingBadge
              borderColor={bookingDetailsColors.borderStrong}
              value={booking.bookingStatus}
            />
          </View>
          <View style={[styles.infoRow, compact && styles.compactInfoRow]}>
            <Ionicons
              color={bookingDetailsColors.textSecondary}
              name="calendar-outline"
              size={17}
            />
            <Text style={styles.infoText}>{booking.scheduleLabel}</Text>
          </View>
          <View style={[styles.infoRow, compact && styles.compactInfoRow]}>
            <Ionicons
              color={bookingDetailsColors.textSecondary}
              name="location-outline"
              size={17}
            />
            <Text style={styles.infoText}>{booking.address}</Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel={`Call ${booking.customerName}`}
          accessibilityRole="button"
          disabled={!booking.customerPhone}
          onPress={onCallPress}
          style={({ pressed }) => [
            styles.callButton,
            compact && styles.compactCallButton,
            !booking.customerPhone && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            color={bookingDetailsColors.textPrimary}
            name="call-outline"
            size={22}
          />
        </Pressable>
      </View>

      <BookingStatusTracker compact={compact} status={booking.bookingStatus} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...bookingDetailsCardStyle,
    padding: 18,
  },
  compactCard: {
    padding: 15,
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  compactTopRow: {
    gap: 9,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: bookingDetailsColors.avatarSurface,
    borderColor: bookingDetailsColors.border,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  compactAvatar: {
    borderRadius: 20,
    height: 56,
    width: 56,
  },
  customerCopy: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    color: bookingDetailsColors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
  },
  compactCustomerName: {
    fontSize: 17,
    lineHeight: 21,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 7,
  },
  compactBadges: {
    gap: 5,
    marginTop: 5,
  },
  infoRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 7,
    marginTop: 9,
  },
  compactInfoRow: {
    marginTop: 7,
  },
  infoText: {
    color: bookingDetailsColors.textSecondary,
    flex: 1,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  callButton: {
    alignItems: "center",
    backgroundColor: bookingDetailsColors.surface,
    borderColor: bookingDetailsColors.controlBorder,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  compactCallButton: {
    borderRadius: 12,
    height: 42,
    width: 42,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    backgroundColor: bookingDetailsColors.surfaceSoft,
  },
});
