import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSheetEntrance } from "../../../components/common/useSheetEntrance";

import { colors } from "../../../theme/colors";
import { reportPeriodOptions } from "../data/reportsConfig";
import type { ReportPeriodId } from "../models/reports";

interface ReportPeriodModalProps {
  onChange: (period: ReportPeriodId) => void;
  onClose: () => void;
  value: ReportPeriodId;
}

export function ReportPeriodModal({
  onChange,
  onClose,
  value,
}: ReportPeriodModalProps) {
  const insets = useSafeAreaInsets();
  const entrance = useSheetEntrance();
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close reporting period"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            entrance,
            { paddingBottom: Math.max(insets.bottom, 18) },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Reporting period</Text>
          <Text style={styles.subtitle}>
            Choose the range used across this dashboard.
          </Text>
          <View style={styles.options}>
            {reportPeriodOptions.map((option) => {
              const selected = option.id === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={option.id}
                  onPress={() => {
                    onChange(option.id);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.selectedOption,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.selectedOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(8,35,71,0.22)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: "#D0D5DD",
    borderRadius: 2,
    height: 4,
    width: 38,
  },
  option: {
    borderColor: "#E6EAF0",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  optionText: { color: colors.textSecondary, fontSize: 13, fontWeight: "500" },
  options: { gap: 9, marginTop: 18 },
  pressed: { opacity: 0.68 },
  root: { flex: 1, justifyContent: "flex-end" },
  selectedOption: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.actionBlue,
  },
  selectedOptionText: { color: colors.actionBlue, fontWeight: "600" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
  },
  title: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 25,
    marginTop: 14,
  },
});
