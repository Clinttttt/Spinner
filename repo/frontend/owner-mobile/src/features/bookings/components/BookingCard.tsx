import Ionicons from "@expo/vector-icons/Ionicons";
import { memo } from "react";
import { Pressable, Platform, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import type { BookingListItem } from "../models/booking";
import { BookingBadge } from "./BookingBadge";
import {
  bookingServicePalettes,
  getBookingServicePaletteVariant,
} from "./bookingServicePalettes";
import { ServiceTag } from "./ServiceTag";

interface BookingCardProps {
  booking: BookingListItem;
  /**
   * Passed in rather than measured here.
   *
   * The list already knows the width, and subscribing to dimensions inside a memoised
   * row meant every row held its own subscription and all of them re-rendered on any
   * dimension change, which is exactly what the memo exists to prevent.
   */
  compact?: boolean;
  onClearPress?: (booking: BookingListItem) => void;
  onViewPress: (bookingId: string) => void;
}

function BookingCardComponent({
  booking,
  compact = false,
  onClearPress,
  onViewPress,
}: BookingCardProps) {
  const servicePalette =
    bookingServicePalettes[
      getBookingServicePaletteVariant(booking.serviceTags.length)
    ];
  // Also offered for an order that is stuck open and unpaid, which the handler
  // cancels first. Otherwise such an order has no available action at all.
  const showClear =
    (booking.canClear || booking.canCancel) && Boolean(onClearPress);
  // Clear and View together need most of the row, so a clearable card shows one
  // tag plus a "+N" chip instead of two full tags.
  const visibleTagCount = showClear ? 1 : 2;
  const hiddenTagCount = Math.max(
    0,
    booking.serviceTags.length - visibleTagCount,
  );

  return (
    <View style={styles.card}>
      <View style={[styles.topRow, compact && styles.compactTopRow]}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.avatar, compact && styles.compactAvatar]}
        >
          <Ionicons color={colors.navy} name="person-outline" size={27} />
        </View>

        <View style={styles.content}>
          <View style={styles.headingRow}>
            <Text numberOfLines={1} style={styles.customerName}>
              {booking.customerName}
            </Text>
            <View style={styles.badges}>
              <BookingBadge value={booking.paymentStatus} />
              <BookingBadge value={booking.bookingStatus} />
            </View>
          </View>

          {/* A returning customer books repeatedly under the same name, often for
              the same time window, so name and schedule alone made separate
              bookings look like one repeated row. The code is what tells them
              apart. */}
          <Text numberOfLines={1} style={styles.bookingCode}>
            {booking.bookingCode}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons
              color={colors.textSecondary}
              name="calendar-outline"
              size={16}
            />
            <Text numberOfLines={1} style={styles.metaText}>
              {booking.scheduleLabel}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons
              color={colors.textSecondary}
              name="location-outline"
              size={16}
            />
            <Text numberOfLines={2} style={styles.metaText}>
              {booking.address}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.footerRow, compact && styles.compactFooterRow]}>
        <View style={styles.serviceTags}>
          {booking.serviceTags.slice(0, visibleTagCount).map((service) => (
            <ServiceTag
              key={service}
              service={service}
              serviceCount={booking.serviceTags.length}
            />
          ))}
          {hiddenTagCount > 0 ? (
            <View
              style={[
                styles.moreTag,
                {
                  backgroundColor: servicePalette.background,
                  borderColor: servicePalette.border,
                },
              ]}
            >
              <Text
                style={[styles.moreTagText, { color: servicePalette.text }]}
              >
                +{hiddenTagCount}
              </Text>
            </View>
          ) : null}
        </View>

        {showClear ? (
          <Pressable
            accessibilityLabel={`Clear booking ${booking.bookingCode} from the list`}
            accessibilityRole="button"
            onPress={() => onClearPress?.(booking)}
            style={({ pressed }) => [
              styles.clearButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              color={colors.textSecondary}
              name="trash-outline"
              size={16}
            />
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityLabel={`View booking ${booking.bookingCode} for ${booking.customerName}`}
          accessibilityRole="button"
          onPress={() => onViewPress(booking.id)}
          style={({ pressed }) => [
            styles.viewButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.viewButtonText}>View</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const BookingCard = memo(BookingCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.navy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.015,
        shadowRadius: 8,
      },
      android: { elevation: 0 },
      default: {},
    }),
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#E6EAF0",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  compactAvatar: {
    height: 44,
    width: 44,
  },
  compactTopRow: {
    gap: 10,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    minHeight: 30,
  },
  bookingCode: {
    color: colors.textSecondary,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
    letterSpacing: 0.2,
    marginTop: 2,
  },
  customerName: {
    color: colors.navy,
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
    minWidth: 96,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
    marginLeft: "auto",
  },
  metaRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 7,
    marginTop: 7,
  },
  metaText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  footerRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    marginLeft: 60,
    marginTop: 11,
  },
  compactFooterRow: {
    marginLeft: 0,
  },
  serviceTags: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 7,
    minWidth: 0,
  },
  moreTag: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 9,
    height: 28,
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  moreTagText: {
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 15,
  },
  viewButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.navy,
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    minWidth: 70,
    paddingHorizontal: 16,
  },
  clearButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  clearButtonText: {
    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 17,
  },
  viewButtonText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.65,
  },
});
