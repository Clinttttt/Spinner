import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import type { ReportMetric } from "../models/reports";

interface ReportMetricCardProps {
  metric: ReportMetric;
  width: number;
}

export function ReportMetricCard({ metric, width }: ReportMetricCardProps) {
  const trendSymbol =
    metric.trendDirection === "up"
      ? "▲"
      : metric.trendDirection === "down"
        ? "▼"
        : "•";
  const trendColor =
    metric.trendDirection === "up"
      ? colors.success
      : metric.trendDirection === "down"
        ? colors.danger
        : colors.textSecondary;

  return (
    <View
      accessibilityLabel={`${metric.label}, ${metric.value}, ${metric.trendPercent} percent ${metric.trendDirection}`}
      style={[styles.card, { width }]}
    >
      <View style={styles.iconTile}>
        <Ionicons color={colors.navy} name={metric.icon} size={20} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.label}>
          {metric.label}
        </Text>
        <View style={styles.valueRow}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.86}
            numberOfLines={1}
            style={styles.value}
          >
            {metric.value}
          </Text>
          <Text numberOfLines={1} style={[styles.trend, { color: trendColor }]}>
            {trendSymbol} {metric.trendPercent}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 93,
    padding: 12,
  },
  copy: { flex: 1, minWidth: 0 },
  iconTile: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    marginBottom: 8,
    width: 38,
  },
  label: {
    color: colors.neutralText,
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 15,
  },
  trend: { fontSize: 9.5, fontWeight: "500", lineHeight: 13, marginLeft: 4 },
  value: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 21,
  },
  valueRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
});
