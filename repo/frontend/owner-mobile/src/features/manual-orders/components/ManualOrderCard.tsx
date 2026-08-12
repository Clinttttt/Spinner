import Ionicons from "@expo/vector-icons/Ionicons";
import { memo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import { BookingBadge } from "../../bookings/components/BookingBadge";
import type {
  BookingStatus,
  PaymentStatus,
} from "../../bookings/models/booking";
import type { ManualOrder } from "../models/manualOrder";
import { methodLabel } from "../services/manualOrdersService";

function statusLabel(status: ManualOrder["status"]) {
  return {
    created: "Created",
    confirmed: "Confirmed",
    inProcess: "In Process",
    ready: "Ready",
    completed: "Completed",
    cancelled: "Cancelled",
  }[status];
}

function bookingStatusValue(status: ManualOrder["status"]): BookingStatus {
  if (status === "created") return "new";
  // "cancelled" used to be reported as "completed", which showed a cancelled order as
  // finished work. BookingStatus carries a cancelled state, so it passes straight through.
  return status;
}

function paymentStatusValue(order: ManualOrder): PaymentStatus {
  if (order.paymentStatus === "paid") return "paid";
  return "unpaid";
}

function ManualOrderCardComponent({
  compact = false,
  onClearPress,
  order,
  onViewPress,
}: {
  /** Passed in rather than measured here, so a memoised row holds no subscription. */
  compact?: boolean;
  onClearPress?: (order: ManualOrder) => void;
  order: ManualOrder;
  onViewPress: (id: string) => void;
}) {
  const canClear =
    order.apiStatus === "Completed" || order.apiStatus === "Rejected";
  const methodSummary = `${methodLabel(order.method)}${
    order.services.length > 0 ? ` + ${order.services.length} more` : ""
  }`;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.avatar, compact && styles.compactAvatar]}>
          <Ionicons color={colors.navy} name="person-outline" size={26} />
        </View>
        <View style={styles.content}>
          <View style={styles.headingRow}>
            <Text numberOfLines={1} style={styles.customerName}>
              {order.customerName}
            </Text>
            <View style={styles.badges}>
              <BookingBadge
                labelOverride={
                  order.paymentStatus === "waitingOnline"
                    ? "Online Pending"
                    : undefined
                }
                value={paymentStatusValue(order)}
              />
              <BookingBadge
                labelOverride={statusLabel(order.status)}
                value={bookingStatusValue(order.status)}
              />
            </View>
          </View>
          <View style={styles.metaRow}>
            <Ionicons
              color={colors.textSecondary}
              name="time-outline"
              size={16}
            />
            <Text numberOfLines={1} style={styles.metaText}>
              {order.scheduleLabel}
            </Text>
          </View>
          {order.address ? (
            <View style={styles.metaRow}>
              <Ionicons
                color={colors.textSecondary}
                name="location-outline"
                size={16}
              />
              <Text numberOfLines={2} style={styles.metaText}>
                {order.address}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={[styles.footerRow, compact && styles.compactFooterRow]}>
        <View style={styles.tags}>
          <View style={styles.tag}>
            <Ionicons
              color={colors.navy}
              name={
                order.method === "walkIn"
                  ? "walk-outline"
                  : order.method === "dropOff"
                    ? "bag-handle-outline"
                    : "car-outline"
              }
              size={15}
            />
            <Text numberOfLines={1} style={styles.tagText}>
              {methodSummary}
            </Text>
          </View>
        </View>
        {canClear && onClearPress ? (
          <Pressable
            accessibilityLabel={`Clear order ${order.orderCode} from the list`}
            accessibilityRole="button"
            onPress={() => onClearPress(order)}
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
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel={`View order ${order.orderCode}`}
          accessibilityRole="button"
          onPress={() => onViewPress(order.id)}
          style={({ pressed }) => [
            styles.viewButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.viewText}>View</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const ManualOrderCard = memo(ManualOrderCardComponent);

const styles = StyleSheet.create({
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
  badges: { flexDirection: "row", gap: 5, marginLeft: "auto" },
  clearButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  clearText: {
    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: "600",
  },
  footerRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    marginLeft: 60,
    marginTop: 11,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    ...Platform.select({
      android: { elevation: 0 },
      default: {},
      ios: {
        shadowColor: colors.navy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.015,
        shadowRadius: 8,
      },
    }),
  },
  compactAvatar: { height: 46, width: 46 },
  compactFooterRow: { marginLeft: 0 },
  content: { flex: 1, minWidth: 0 },
  customerName: {
    color: colors.navy,
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
    minWidth: 92,
  },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    minHeight: 29,
  },
  metaRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 7,
    marginTop: 6,
  },
  metaText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  pressed: { opacity: 0.68 },
  tag: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexShrink: 1,
    gap: 5,
    height: 28,
    maxWidth: "100%",
    paddingHorizontal: 9,
  },
  tags: { flex: 1, flexDirection: "row", minWidth: 0 },
  tagText: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 15,
  },
  topRow: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  viewButton: {
    alignItems: "center",
    borderColor: colors.navy,
    borderRadius: 11,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    minWidth: 68,
    paddingHorizontal: 14,
  },
  viewText: { color: colors.navy, fontSize: 13, fontWeight: "600" },
});
