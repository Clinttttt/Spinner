import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

import { pickupColors, pickupOverviewCardStyle } from "./pickupTheme";

interface PickupOverviewCardProps {
  compact: boolean;
  onRoute: number;
  pickedUp: number;
  scheduled: number;
}

const metrics = [
  {
    key: "scheduled",
    label: "Scheduled",
  },
  {
    key: "onRoute",
    label: "On Route",
  },
  {
    key: "pickedUp",
    label: "Picked Up",
  },
];

export function PickupOverviewCard({
  compact,
  onRoute,
  pickedUp,
  scheduled,
}: PickupOverviewCardProps) {
  const values = { onRoute, pickedUp, scheduled };

  return (
    <View
      accessibilityLabel={`Pickup overview. ${scheduled} scheduled, ${onRoute} on route, ${pickedUp} picked up`}
      style={styles.card}
    >
      {metrics.map((metric, index) => (
        <Fragment key={metric.key}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.metricSlot}>
            <Text
              numberOfLines={1}
              style={[styles.label, compact && styles.compactLabel]}
            >
              {metric.label}
            </Text>
            <Text style={styles.value}>
              {values[metric.key as keyof typeof values]}
            </Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...pickupOverviewCardStyle,
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    minHeight: 96,
    paddingHorizontal: 10,
    paddingVertical: 13,
    width: "100%",
  },
  metricSlot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 6,
  },
  divider: {
    backgroundColor: pickupColors.borderStrong,
    flexShrink: 0,
    height: 46,
    marginHorizontal: 2,
    width: StyleSheet.hairlineWidth,
  },
  label: {
    color: pickupColors.textSecondary,
    fontSize: 11.5,
    fontWeight: "400",
    lineHeight: 15,
    textAlign: "center",
  },
  compactLabel: { fontSize: 11 },
  value: {
    color: pickupColors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 21,
    marginTop: 4,
    textAlign: "center",
  },
});
