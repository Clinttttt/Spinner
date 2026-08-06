import { memo, useCallback } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import type { TransactionHistoryItem } from "../models/transaction";

interface TransactionRowProps {
  compact?: boolean;
  isLast?: boolean;
  item: TransactionHistoryItem;
  /**
   * Whether the owner has opened this one yet.
   *
   * Shown as a faint tint and a heavier title rather than a badge or a colour: this is a
   * ledger, and the point is only to help pick up where you left off.
   */
  unread?: boolean;
  /**
   * Given the item, so the list can pass one stable callback for every row.
   * A per-row arrow would be a new function on each render and would defeat the memo
   * below, which is the whole reason this component is memoised.
   */
  onPress?: (item: TransactionHistoryItem) => void;
}

export function formatPeso(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function details(item: TransactionHistoryItem) {
  if (item.orderCode) {
    return `Order ${item.orderCode} · ${item.serviceLabel ?? "Laundry service"}`;
  }
  const date = formatDate(item.occurredAt);
  return item.note ? `${item.note} · ${date}` : date;
}

function visual(item: TransactionHistoryItem) {
  if (item.kind === "manualDeduction") {
    return {
      amount: colors.danger,
      background: "#FDECEC",
      border: "transparent",
      icon: "arrow-down-outline" as const,
      iconColor: colors.danger,
    };
  }
  if (item.kind === "manualIncome") {
    return {
      amount: "#2E9B36",
      background: "#ECF8EF",
      border: "transparent",
      icon: "arrow-up-outline" as const,
      iconColor: "#2E9B36",
    };
  }
  return {
    amount: "#2E9B36",
    background: colors.surface,
    border: colors.navy,
    icon: "receipt-outline" as const,
    iconColor: colors.navy,
  };
}

function TransactionRowComponent({
  compact = false,
  isLast = false,
  item,
  onPress,
  unread = false,
}: TransactionRowProps) {
  const palette = visual(item);
  const rowDetails = details(item);

  // Bound here rather than by the caller, so the list can hand every row the same
  // callback and the memo above actually holds.
  const handlePress = useCallback(() => onPress?.(item), [item, onPress]);

  return (
    <Pressable
      accessibilityLabel={`${unread ? "Unopened. " : ""}${item.title}, ${rowDetails}, ${formatPeso(item.amount)}`}
      accessibilityRole={onPress ? "button" : "text"}
      disabled={!onPress}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        compact && styles.compactRow,
        // Before the divider, so the tint does not paint over the separating line.
        unread && styles.unreadRow,
        !isLast && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.iconTile,
          compact && styles.compactIconTile,
          {
            backgroundColor: palette.background,
            borderColor: palette.border,
          },
        ]}
      >
        <Ionicons
          color={palette.iconColor}
          name={palette.icon}
          size={compact ? 19 : 23}
        />
      </View>
      <View style={styles.copy}>
        <Text
          numberOfLines={1}
          style={[styles.title, unread && styles.unreadTitle]}
        >
          {item.title}
        </Text>
        <Text numberOfLines={compact ? 1 : 2} style={styles.details}>
          {rowDetails}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={[styles.amount, { color: palette.amount }]}
      >
        {formatPeso(item.amount)}
      </Text>
      {onPress ? (
        <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  amount: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    marginLeft: 7,
    maxWidth: 106,
  },
  compactIconTile: { height: 38, width: 38 },
  compactRow: { minHeight: 60, paddingVertical: 9 },
  copy: { flex: 1, minWidth: 0 },
  details: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
  },
  divider: { borderBottomColor: colors.divider, borderBottomWidth: 1 },
  iconTile: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pressed: { opacity: 0.68 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    minHeight: 72,
    paddingVertical: 12,
  },
  // Deliberately faint. This marks where the owner left off; it is not a warning, and
  // a ledger where half the rows shout is worse than one with no marking at all. The
  // negative margins let the tint reach the card edges while the row keeps its padding.
  unreadRow: {
    backgroundColor: colors.blueSoft,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  unreadTitle: { fontWeight: "700" },
  title: {
    color: colors.navy,
    fontSize: 15.5,
    fontWeight: "600",
    lineHeight: 20,
  },
});

// Memoised so scrolling and searching do not re-render every row and its icons.
export const TransactionRow = memo(TransactionRowComponent);
