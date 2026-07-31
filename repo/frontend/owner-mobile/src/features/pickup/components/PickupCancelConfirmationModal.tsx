import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../../theme/colors";
import type { PickupTask } from "../models/pickup";

interface PickupCancelConfirmationModalProps {
  item: PickupTask;
  onClose: () => void;
  onConfirm: () => void;
}

export function PickupCancelConfirmationModal({
  item,
  onClose,
  onConfirm,
}: PickupCancelConfirmationModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close pickup cancellation confirmation"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Cancel pickup?</Text>
          <Text style={styles.body}>
            Cancel the scheduled pickup for {item.customerName}? This will
            remove {item.bookingCode} from the pickup schedule.
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.button,
                styles.keepButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.keepButtonText}>Keep Pickup</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancel Pickup</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  backdrop: {
    backgroundColor: "rgba(8,35,71,0.24)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  button: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
  },
  cancelButton: {
    backgroundColor: colors.danger,
  },
  cancelButtonText: {
    color: colors.surface,
    fontSize: 13.5,
    fontWeight: "700",
  },
  handle: {
    alignSelf: "center",
    backgroundColor: "#D0D5DD",
    borderRadius: 2,
    height: 4,
    width: 38,
  },
  keepButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  keepButtonText: {
    color: colors.navy,
    fontSize: 13.5,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.72,
  },
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  title: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 25,
    marginTop: 14,
  },
});
