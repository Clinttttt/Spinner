import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import type { TopServiceReport } from "../models/reports";
import { TopServiceRow } from "./TopServiceRow";
import { TopServicesDonut } from "./TopServicesDonut";

interface TopServicesCardProps {
  compact: boolean;
  onSortPress: () => void;
  services: TopServiceReport[];
}

export function TopServicesCard({
  compact,
  onSortPress,
  services,
}: TopServicesCardProps) {
  const donutSize = compact ? 140 : 126;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Top Services</Text>
        <Pressable
          accessibilityLabel="Sort top services, currently by revenue"
          accessibilityRole="button"
          onPress={onSortPress}
          style={({ pressed }) => [styles.selector, pressed && styles.pressed]}
        >
          <Text style={styles.selectorText}>By Revenue</Text>
          <Ionicons
            color={colors.textSecondary}
            name="chevron-down"
            size={14}
          />
        </Pressable>
      </View>

      <View style={[styles.content, compact && styles.compactContent]}>
        <View
          style={[styles.serviceList, compact && styles.compactServiceList]}
        >
          {services.map((service) => (
            <TopServiceRow key={service.id} service={service} />
          ))}
        </View>
        <View style={[styles.donutWrap, compact && styles.compactDonutWrap]}>
          <TopServicesDonut services={services} size={donutSize} />
        </View>
      </View>
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
  compactContent: { flexDirection: "column" },
  compactDonutWrap: { alignSelf: "center", marginLeft: 0, marginTop: 16 },
  compactServiceList: { alignSelf: "stretch", width: "100%" },
  content: { alignItems: "center", flexDirection: "row", marginTop: 16 },
  donutWrap: { alignItems: "center", justifyContent: "center", marginLeft: 10 },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
  serviceList: { flex: 1, gap: 13, minWidth: 0 },
  title: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
});
