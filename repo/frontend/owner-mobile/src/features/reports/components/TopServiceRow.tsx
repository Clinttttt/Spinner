import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import { reportServiceColors } from "../data/reportsConfig";
import type { TopServiceReport } from "../models/reports";

interface TopServiceRowProps {
  service: TopServiceReport;
}

function formatCurrency(value: number) {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function TopServiceRow({ service }: TopServiceRowProps) {
  const serviceColor = reportServiceColors[service.colorKey];

  return (
    <View
      accessibilityLabel={`${service.name}, ${formatCurrency(service.revenue)}, ${service.percentage} percent of revenue`}
      style={styles.row}
    >
      <View style={[styles.iconTile, { backgroundColor: `${serviceColor}14` }]}>
        <Ionicons color={serviceColor} name={service.icon} size={16} />
      </View>
      <View style={styles.content}>
        <View style={styles.labelRow}>
          <Text numberOfLines={1} style={styles.name}>
            {service.name}
          </Text>
          <Text numberOfLines={1} style={styles.amount}>
            {formatCurrency(service.revenue)} ({service.percentage}%)
          </Text>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                backgroundColor: serviceColor,
                width: `${service.percentage}%`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: 9.5,
    lineHeight: 14,
    marginLeft: 5,
    textAlign: "right",
  },
  content: { flex: 1, minWidth: 0 },
  fill: { borderRadius: 999, height: "100%" },
  iconTile: {
    alignItems: "center",
    borderRadius: 9,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  name: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 17,
  },
  row: { alignItems: "center", flexDirection: "row", gap: 9 },
  track: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 5,
    marginTop: 5,
    overflow: "hidden",
  },
});
