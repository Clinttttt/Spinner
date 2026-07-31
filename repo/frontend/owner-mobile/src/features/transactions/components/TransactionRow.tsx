import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import type { TransactionHistoryItem } from "../models/transaction";

interface TransactionRowProps {
  compact?: boolean;
  isLast?: boolean;
  item: TransactionHistoryItem;
  onPress?: () => void;
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

export function TransactionRow({
  compact = false,
  isLast = false,
  item,
  onPress,
}: TransactionRowProps) {
  const palette = visual(item);
  const rowDetails = details(item);

  return (
    <Pressable
      accessibilityLabel={`${item.title}, ${rowDetails}, ${formatPeso(item.amount)}`}
      accessibilityRole={onPress ? "button" : "text"}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        compact && styles.compactRow,
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
        <Text numberOfLines={1} style={styles.title}>
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
  title: {
    color: colors.navy,
    fontSize: 15.5,
    fontWeight: "600",
    lineHeight: 20,
  },
});
