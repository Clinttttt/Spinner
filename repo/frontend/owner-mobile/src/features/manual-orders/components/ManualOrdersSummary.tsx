import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";

export function ManualOrdersSummary({
  active,
  ready,
  unpaid,
}: {
  active: number;
  ready: number;
  unpaid: number;
}) {
  const metrics = [
    { label: "Active", value: active },
    { label: "Unpaid", value: unpaid },
    { label: "Ready", value: ready },
  ];
  return (
    <View
      accessibilityLabel={`${active} active, ${unpaid} unpaid, ${ready} ready manual orders`}
      style={styles.card}
    >
      {metrics.map((metric, index) => (
        <Fragment key={metric.label}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.metric}>
            <Text style={styles.label}>{metric.label}</Text>
            <Text style={styles.value}>{metric.value}</Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 88,
    paddingHorizontal: 8,
  },
  divider: {
    backgroundColor: colors.divider,
    height: 44,
    width: StyleSheet.hairlineWidth,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  metric: { alignItems: "center", flex: 1, minWidth: 0 },
  value: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
    marginTop: 3,
  },
});
