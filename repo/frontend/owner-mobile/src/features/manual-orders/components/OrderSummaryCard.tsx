import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import { ManualOrderFormSection } from "./ManualOrderFormSection";

function peso(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

interface OrderSummaryCardProps {
  additionalCharge: number;
  deliveryFee: number;
  discount: number;
  onAdjustPress: () => void;
  serviceAmount: number;
  totalAmount: number;
}

export function OrderSummaryCard({
  additionalCharge,
  deliveryFee,
  discount,
  onAdjustPress,
  serviceAmount,
  totalAmount,
}: OrderSummaryCardProps) {
  return (
    <ManualOrderFormSection icon="pricetag-outline" title="Summary">
      <SummaryRow label="Service Amount" value={peso(serviceAmount)} />
      <SummaryRow label="Delivery Fee" value={peso(deliveryFee)} />
      <SummaryRow label="Additional Charges" value={peso(additionalCharge)} />
      <SummaryRow label="Discount" value={`-${peso(discount)}`} />
      <View style={styles.divider} />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text
          accessibilityLabel={`Total ${peso(totalAmount)}`}
          style={styles.totalValue}
        >
          {peso(totalAmount)}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onAdjustPress}
        style={({ pressed }) => [
          styles.adjustButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.adjustText}>Adjust Charges</Text>
        <Ionicons color={colors.actionBlue} name="chevron-forward" size={18} />
      </Pressable>
    </ManualOrderFormSection>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  adjustButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: 2,
    minHeight: 44,
    marginTop: 4,
  },
  adjustText: { color: colors.actionBlue, fontSize: 13, fontWeight: "600" },
  divider: {
    backgroundColor: colors.divider,
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 30,
  },
  rowLabel: { color: colors.textSecondary, fontSize: 12.5 },
  rowValue: { color: colors.navy, fontSize: 12.5, fontWeight: "600" },
  totalLabel: { color: colors.navy, fontSize: 15, fontWeight: "700" },
  totalRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalValue: { color: colors.navy, fontSize: 20, fontWeight: "700" },
});
