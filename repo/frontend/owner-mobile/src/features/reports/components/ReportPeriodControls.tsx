import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";

interface ReportPeriodControlsProps {
  filtersActive: boolean;
  onFilterPress: () => void;
  onPeriodPress: () => void;
  periodLabel: string;
}

export function ReportPeriodControls({
  filtersActive,
  onFilterPress,
  onPeriodPress,
  periodLabel,
}: ReportPeriodControlsProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={`Reporting period, ${periodLabel}`}
        accessibilityRole="button"
        onPress={onPeriodPress}
        style={({ pressed }) => [
          styles.periodControl,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons color={colors.navy} name="calendar-outline" size={18} />
        <Text numberOfLines={1} style={styles.periodText}>
          {periodLabel}
        </Text>
        <Ionicons color={colors.textSecondary} name="chevron-down" size={16} />
      </Pressable>

      <Pressable
        accessibilityLabel={
          filtersActive ? "Filter reports, filters active" : "Filter reports"
        }
        accessibilityRole="button"
        onPress={onFilterPress}
        style={({ pressed }) => [
          styles.filterControl,
          pressed && styles.pressed,
        ]}
      >
        <View>
          <Ionicons color={colors.navy} name="options-outline" size={18} />
          {filtersActive ? <View style={styles.activeDot} /> : null}
        </View>
        <Text style={styles.filterText}>Filter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  activeDot: {
    backgroundColor: colors.actionBlue,
    borderRadius: 3,
    height: 6,
    position: "absolute",
    right: -2,
    top: -2,
    width: 6,
  },
  filterControl: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#DDE3EA",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    height: 46,
    justifyContent: "center",
    minWidth: 88,
    paddingHorizontal: 12,
  },
  filterText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  periodControl: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#DDE3EA",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    height: 46,
    minWidth: 0,
    paddingHorizontal: 13,
  },
  periodText: {
    color: colors.navy,
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  pressed: { opacity: 0.68 },
  row: { flexDirection: "row", gap: 10 },
});
