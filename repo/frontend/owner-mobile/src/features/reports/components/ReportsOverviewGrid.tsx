import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import type { ReportMetric } from "../models/reports";
import { ReportMetricCard } from "./ReportMetricCard";

interface ReportsOverviewGridProps {
  availableWidth: number;
  comparisonLabel: string;
  metrics: ReportMetric[];
}

export function ReportsOverviewGrid({
  availableWidth,
  comparisonLabel,
  metrics,
}: ReportsOverviewGridProps) {
  const cardWidth = (availableWidth - 10) / 2;

  return (
    <View>
      <View style={styles.headingRow}>
        <Text style={styles.title}>Overview</Text>
        <Text numberOfLines={1} style={styles.comparison}>
          {comparisonLabel}
        </Text>
      </View>
      <View style={styles.grid}>
        {metrics.map((metric) => (
          <ReportMetricCard key={metric.id} metric={metric} width={cardWidth} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  comparison: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: "right",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
});
