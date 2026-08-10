import { StyleSheet, View } from "react-native";

import { SkeletonPulse } from "../../../components/common/SkeletonPulse";
import { colors } from "../../../theme/colors";

function SkeletonBlock({
  height,
  width = "100%",
}: {
  height: number;
  width?: number | `${number}%`;
}) {
  return <View style={[styles.block, { height, width }]} />;
}

export function ReportsSkeleton() {
  return (
    <SkeletonPulse accessibilityLabel="Loading reports" style={styles.root}>
      <View style={styles.controls}>
        <SkeletonBlock height={46} width="72%" />
        <SkeletonBlock height={46} width="25%" />
      </View>
      <SkeletonBlock height={18} width="34%" />
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((item) => (
          <SkeletonBlock height={93} key={item} width="48.5%" />
        ))}
      </View>
      <SkeletonBlock height={294} />
      <SkeletonBlock height={280} />
    </SkeletonPulse>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.neutralSoft, borderRadius: 16 },
  controls: { flexDirection: "row", justifyContent: "space-between" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  root: { gap: 14 },
});
