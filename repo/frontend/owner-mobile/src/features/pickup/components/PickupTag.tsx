import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import type { PickupService } from "../models/pickup";
import { getPickupServicePalette } from "./pickupTheme";

const serviceIcons: Record<
  PickupService["type"],
  keyof typeof Ionicons.glyphMap
> = {
  pickup: "car-outline",
  washDryFold: "shirt-outline",
  selfService: "storefront-outline",
};

interface PickupTagProps {
  compact: boolean;
  service: PickupService;
  serviceCount: number;
}

export function PickupTag({ compact, service, serviceCount }: PickupTagProps) {
  const palette = getPickupServicePalette(serviceCount);

  return (
    <View
      style={[
        styles.tag,
        compact && styles.compactTag,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
      ]}
    >
      <Ionicons
        color={palette.icon}
        name={serviceIcons[service.type]}
        size={14}
      />
      <Text numberOfLines={1} style={[styles.text, { color: palette.text }]}>
        {service.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexShrink: 1,
    gap: 4,
    height: 28,
    paddingHorizontal: 9,
  },
  compactTag: { paddingHorizontal: 8 },
  text: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 15,
  },
});
