import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../../../theme/colors";
import type { TransactionSort } from "../models/transaction";

export const transactionSortLabels: Record<TransactionSort, string> = {
  highest: "Highest Amount",
  latest: "Latest",
  lowest: "Lowest Amount",
  oldest: "Oldest",
};

interface TransactionSortModalProps {
  onChange: (value: TransactionSort) => void;
  onClose: () => void;
  value: TransactionSort;
  visible: boolean;
}

export function TransactionSortModal({
  onChange,
  onClose,
  value,
  visible,
}: TransactionSortModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onClose}
        style={styles.scrim}
      >
        <Pressable onPress={() => undefined} style={styles.sheet}>
          <Text style={styles.title}>Sort transactions</Text>
          {(Object.keys(transactionSortLabels) as TransactionSort[]).map(
            (option) => {
              const selected = option === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={option}
                  onPress={() => {
                    onChange(option);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      selected && styles.selectedLabel,
                    ]}
                  >
                    {transactionSortLabels[option]}
                  </Text>
                  {selected ? (
                    <Ionicons
                      color={colors.actionBlue}
                      name="checkmark"
                      size={20}
                    />
                  ) : null}
                </Pressable>
              );
            },
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  option: {
    alignItems: "center",
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 50,
    justifyContent: "space-between",
  },
  optionLabel: { color: colors.textPrimary, fontSize: 15 },
  pressed: { opacity: 0.66 },
  scrim: {
    backgroundColor: "rgba(8,35,71,0.22)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  selectedLabel: { color: colors.actionBlue, fontWeight: "600" },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  title: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
});
