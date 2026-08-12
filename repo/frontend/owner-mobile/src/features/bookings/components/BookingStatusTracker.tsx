import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import type { BookingStatus } from "../models/booking";
import { bookingDetailsColors } from "./bookingDetailsTheme";

interface BookingStatusTrackerProps {
  compact?: boolean;
  status: BookingStatus;
}

const steps: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: BookingStatus;
}[] = [
  { icon: "document-text-outline", label: "New", value: "new" },
  { icon: "calendar-outline", label: "Confirmed", value: "confirmed" },
  { icon: "water-outline", label: "In Process", value: "inProcess" },
  { icon: "shirt-outline", label: "Ready", value: "ready" },
  { icon: "checkmark-circle-outline", label: "Completed", value: "completed" },
];

export function BookingStatusTracker({
  compact = false,
  status,
}: BookingStatusTrackerProps) {
  const currentIndex = steps.findIndex((step) => step.value === status);

  // A turned-down order never travels this path, so the steps say nothing about it.
  // Rendering them anyway highlighted none of them and announced the raw status, which
  // read as a fault rather than as a decision the owner had made.
  if (status === "cancelled") {
    return (
      <View
        accessibilityLabel="This booking was cancelled"
        style={[styles.panel, compact && styles.compactPanel, styles.terminal]}
      >
        <Ionicons
          color={bookingDetailsColors.trackerText}
          name="close-circle-outline"
          size={18}
        />
        <Text style={styles.terminalText}>
          Cancelled. This booking will not be processed.
        </Text>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={`Current booking status: ${steps[currentIndex]?.label ?? status}`}
      style={[styles.panel, compact && styles.compactPanel]}
    >
      {steps.map((step, index) => {
        const current = index === currentIndex;
        const color = current
          ? bookingDetailsColors.activeBlue
          : bookingDetailsColors.trackerText;

        return (
          <View key={step.value} style={styles.step}>
            <View
              style={[
                styles.iconContainer,
                compact && styles.compactIconContainer,
                current && styles.currentIconContainer,
              ]}
            >
              <Ionicons
                color={color}
                name={step.icon}
                size={compact ? 21 : 23}
              />
            </View>
            <Text
              numberOfLines={2}
              style={[
                styles.stepLabel,
                compact && styles.compactStepLabel,
                { color },
                current && styles.currentStepLabel,
              ]}
            >
              {step.label}
            </Text>
            {current ? (
              <View
                style={[styles.activeDot, compact && styles.compactActiveDot]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: bookingDetailsColors.surfaceSoft,
    borderColor: bookingDetailsColors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    marginTop: 16,
    paddingHorizontal: 7,
    paddingVertical: 13,
  },
  compactPanel: {
    marginTop: 12,
    paddingHorizontal: 4,
    paddingVertical: 9,
  },
  terminal: {
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  terminalText: {
    color: bookingDetailsColors.trackerText,
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 17,
  },
  step: {
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  compactIconContainer: {
    height: 32,
    width: 32,
  },
  currentIconContainer: {
    backgroundColor: bookingDetailsColors.activeBlueSoft,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 14,
    marginTop: 5,
    minHeight: 28,
    textAlign: "center",
  },
  compactStepLabel: {
    lineHeight: 13,
    marginTop: 3,
    minHeight: 26,
  },
  currentStepLabel: {
    fontWeight: "600",
  },
  activeDot: {
    backgroundColor: bookingDetailsColors.activeBlue,
    borderRadius: 3,
    height: 6,
    marginTop: 3,
    width: 6,
  },
  compactActiveDot: {
    height: 5,
    marginTop: 2,
    width: 5,
  },
});
