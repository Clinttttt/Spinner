import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import type { RevenuePoint } from "../models/reports";
import { RevenueChart } from "./RevenueChart";

interface RevenueOverviewCardProps {
  compact: boolean;
  comparisonLabel: string;
  onIntervalPress: () => void;
  points: RevenuePoint[];
  total: number;
  trendPercent: number;
}

function formatCurrency(value: number) {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RevenueOverviewCard({
  compact,
  comparisonLabel,
  onIntervalPress,
  points,
  total,
  trendPercent,
}: RevenueOverviewCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Net Revenue Overview</Text>
        <Pressable
          accessibilityLabel="Change revenue chart interval, currently daily"
          accessibilityRole="button"
          onPress={onIntervalPress}
          style={({ pressed }) => [styles.selector, pressed && styles.pressed]}
        >
          <Text style={styles.selectorText}>Daily</Text>
          <Ionicons
            color={colors.textSecondary}
            name="chevron-down"
            size={14}
          />
        </Pressable>
      </View>

      <Text style={styles.total}>{formatCurrency(total)}</Text>
      <View style={styles.trendRow}>
        <Text style={styles.positiveTrend}>▲ {trendPercent}%</Text>
        <Text numberOfLines={1} style={styles.comparison}>
          {comparisonLabel}
        </Text>
      </View>
      <RevenueChart compact={compact} points={points} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  comparison: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: 10.5,
    lineHeight: 15,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  positiveTrend: {
    color: colors.success,
    fontSize: 10.5,
    fontWeight: "500",
    lineHeight: 15,
    marginRight: 7,
  },
  pressed: { opacity: 0.68 },
  selector: {
    alignItems: "center",
    borderColor: "#DDE3EA",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
    height: 34,
    paddingHorizontal: 10,
  },
  selectorText: { color: colors.navy, fontSize: 11.5, fontWeight: "500" },
  title: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  total: {
    color: colors.navy,
    fontSize: 21,
    fontWeight: "700",
    lineHeight: 27,
    marginTop: 8,
  },
  trendRow: { alignItems: "center", flexDirection: "row", marginTop: 1 },
});
