import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { countLabel } from "../../pickup/services/pickupConfirmation";
import { colors } from "../../../theme/colors";
import type { OrderHistoryEntry } from "../models/orderHistory";

interface OrderHistoryRowProps {
  compact?: boolean;
  expanded: boolean;
  isLast?: boolean;
  item: OrderHistoryEntry;
  onToggle: (orderCode: string) => void;
}

export function formatPeso(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

/**
 * The colour used for a status.
 *
 * Deliberately restrained: navy for anything still in hand, muted grey for a closed
 * job, and the danger tone only for something that will never be delivered. This is
 * the shop's ledger, not a dashboard.
 */
function statusTone(entry: OrderHistoryEntry) {
  if (entry.statusLabel === "Cancelled") return colors.danger;
  if (entry.statusLabel === "Completed") return colors.textSecondary;
  return colors.navy;
}

function OrderHistoryRowComponent({
  compact = false,
  expanded,
  isLast = false,
  item,
  onToggle,
}: OrderHistoryRowProps) {
  const handlePress = useCallback(
    () => onToggle(item.orderCode),
    [item.orderCode, onToggle],
  );

  return (
    <View style={!isLast && styles.divider}>
      <Pressable
        accessibilityHint="Shows the full order details"
        accessibilityLabel={`${item.customerName}, ${item.orderCode}, ${item.statusLabel}, ${formatPeso(item.amount)}`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.row,
          compact && styles.compactRow,
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.iconTile,
            compact && styles.compactIconTile,
            item.source === "manual" && styles.manualTile,
          ]}
        >
          <Ionicons
            color={colors.navy}
            name={
              item.source === "manual" ? "storefront-outline" : "globe-outline"
            }
            size={compact ? 17 : 19}
          />
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>
            {item.customerName}
          </Text>
          <Text numberOfLines={1} style={styles.details}>
            {item.orderCode}
          </Text>
          <Text numberOfLines={1} style={styles.details}>
            {item.serviceName} · {item.scheduleLabel}
          </Text>
        </View>
        <View style={styles.trailing}>
          <Text style={styles.amount}>{formatPeso(item.amount)}</Text>
          <Text style={[styles.status, { color: statusTone(item) }]}>
            {item.statusLabel}
          </Text>
        </View>
        <Ionicons
          color={colors.textMuted}
          name={expanded ? "chevron-up" : "chevron-down"}
          size={17}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.detailPanel}>
          {item.address ? (
            <View style={[styles.detailBlock, styles.detailBlockFirst]}>
              <Text style={styles.detailHeading}>
                {item.source === "manual" ? "Address" : "Pickup address"}
              </Text>
              <Text style={styles.detailParagraph}>{item.address}</Text>
            </View>
          ) : null}

          <View
            style={[
              styles.detailBlock,
              !item.address && styles.detailBlockFirst,
            ]}
          >
            <Text style={styles.detailHeading}>Services</Text>
            {item.serviceLines.map((line, index) => (
              <View
                key={`${line.serviceName}-${index}`}
                style={styles.detailLine}
              >
                <Text style={styles.detailLabel}>
                  {line.serviceName}
                  {line.quantity > 0
                    ? ` · ${countLabel(line.quantity, line.unitLabel)}`
                    : ""}
                </Text>
                <Text style={styles.detailValue}>
                  {formatPeso(line.subtotal)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.detailBlock}>
            <DetailLine
              label="Services total"
              value={formatPeso(item.serviceAmount)}
            />
            {item.deliveryFee > 0 ? (
              <DetailLine
                label="Delivery fee"
                value={formatPeso(item.deliveryFee)}
              />
            ) : null}
            <View style={styles.detailLine}>
              <Text style={styles.detailTotalLabel}>Total</Text>
              <Text style={styles.detailTotalValue}>
                {formatPeso(item.amount)}
              </Text>
            </View>
          </View>

          <View style={styles.detailBlock}>
            <DetailLine label="Contact" value={item.mobileNumber} />
            <DetailLine label="Fulfilment" value={item.fulfillmentLabel} />
            <DetailLine label="Payment" value={item.paymentLabel} />
            {item.receiptCode ? (
              <DetailLine label="Receipt" value={item.receiptCode} />
            ) : null}
            {item.trackingCode ? (
              <DetailLine label="Tracking" value={item.trackingCode} />
            ) : null}
            <DetailLine
              label="Source"
              value={
                item.source === "manual"
                  ? "Typed in at the counter"
                  : "Customer website"
              }
            />
            <DetailLine label="Booked" value={formatMoment(item.createdAt)} />
            {item.paidAt ? (
              <DetailLine label="Paid" value={formatMoment(item.paidAt)} />
            ) : null}
            <DetailLine
              label="Last updated"
              value={formatMoment(item.updatedAt)}
            />
          </View>

          {item.additionalNotes ? (
            <View style={styles.detailBlock}>
              <Text style={styles.detailHeading}>Customer notes</Text>
              <Text style={styles.detailParagraph}>{item.additionalNotes}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function formatMoment(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-PH", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Memoised so paging in more rows does not re-render the ones already on screen.
export const OrderHistoryRow = memo(OrderHistoryRowComponent);

const styles = StyleSheet.create({
  amount: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  compactIconTile: { height: 38, width: 38 },
  compactRow: { minHeight: 62, paddingVertical: 9 },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  detailLabel: { color: colors.textSecondary, fontSize: 12.5 },
  // Groups within the panel, separated by a hairline so services, money and the
  // particulars read as three things rather than one long list.
  detailBlock: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingTop: 9,
  },
  detailHeading: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  detailParagraph: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },
  // The panel already has its own edge, so the topmost group does not need a rule above
  // it as well.
  detailBlockFirst: { borderTopWidth: 0, paddingTop: 0 },
  detailTotalLabel: { color: colors.navy, fontSize: 13, fontWeight: "700" },
  detailTotalValue: { color: colors.navy, fontSize: 14, fontWeight: "700" },
  detailLine: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  detailPanel: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    gap: 9,
    marginBottom: 12,
    padding: 12,
  },
  detailValue: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: "600",
    textAlign: "right",
  },
  details: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 17 },
  divider: { borderBottomColor: colors.divider, borderBottomWidth: 1 },
  iconTile: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  manualTile: { backgroundColor: colors.surfaceSoft },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    minHeight: 74,
    paddingVertical: 12,
  },
  status: { fontSize: 11.5, fontWeight: "600", marginTop: 2 },
  title: {
    color: colors.navy,
    fontSize: 15.5,
    fontWeight: "600",
    lineHeight: 20,
  },
  trailing: { alignItems: "flex-end", minWidth: 84 },
});
