import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { colors } from "../../theme/colors";
import {
  assistantShadow,
  controlShadow,
  speechShadow,
} from "../../theme/shadows";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { SpinlyMascotLoop } from "./SpinlyMascotLoop";

interface SpinlyAssistantCardProps {
  onOrdersPress: () => void;
  onReportsPress: () => void;
}

interface AssistantActionProps {
  accessibilityLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  variant: "outline" | "navy";
}

function AssistantAction({
  accessibilityLabel,
  icon,
  label,
  onPress,
  variant,
}: AssistantActionProps) {
  const isNavy = variant === "navy";

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        isNavy ? styles.navyAction : styles.outlineAction,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.actionContent}>
        <Ionicons
          color={isNavy ? colors.surface : colors.navy}
          name={icon}
          size={22}
        />
        <Text style={[styles.actionText, isNavy && styles.navyActionText]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function SpinlyAssistantCard({
  onOrdersPress,
  onReportsPress,
}: SpinlyAssistantCardProps) {
  const { width } = useWindowDimensions();
  const compact = width <= 360;
  const mascotSize = Math.round(
    Math.min(150, Math.max(124, (width - 70) * 0.44)),
  );

  return (
    <View style={styles.outerShell}>
      <View style={styles.innerSurface}>
        <Text style={styles.label}>SPINLY ASSISTANT</Text>

        <View style={styles.mainRow}>
          <View
            style={[
              styles.mascotArea,
              { height: mascotSize, width: mascotSize },
            ]}
          >
            <SpinlyMascotLoop size={mascotSize} />
          </View>

          <View style={styles.speechPanelWrapper}>
            <View pointerEvents="none" style={styles.speechTailOutline} />
            <View pointerEvents="none" style={styles.speechTailFill} />
            <View
              style={[styles.speechPanel, compact && styles.compactSpeechPanel]}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                numberOfLines={1}
                style={[
                  styles.speechTitle,
                  compact && styles.compactSpeechTitle,
                ]}
              >
                {"Hi, I’m Spinly"}
              </Text>
              <Text
                style={[styles.speechBody, compact && styles.compactSpeechBody]}
              >
                {"I’m here to help you keep things running smoothly today."}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.actionsRow, compact && styles.compactActionsRow]}>
          <AssistantAction
            accessibilityLabel="Create a new manual order"
            icon="add-circle-outline"
            label="New Order"
            onPress={onOrdersPress}
            variant="outline"
          />
          <AssistantAction
            accessibilityLabel="Open reports"
            icon="bar-chart-outline"
            label="Insights"
            onPress={onReportsPress}
            variant="navy"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerShell: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: "rgba(225,230,237,0.9)",
    borderRadius: 29,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    width: "100%",
    ...assistantShadow,
  },
  innerSurface: {
    backgroundColor: colors.surface,
    borderColor: "rgba(240,242,246,0.9)",
    borderRadius: 25,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: 19,
    paddingHorizontal: 19,
    paddingTop: 19,
  },
  label: {
    ...typography.cardEyebrow,
    color: colors.textSecondary,
  },
  mainRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 13,
    minHeight: 166,
  },
  mascotArea: {
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  speechPanelWrapper: {
    flex: 1,
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
  },
  speechTailOutline: {
    borderBottomColor: "transparent",
    borderBottomWidth: 15,
    borderRightColor: "#E1E7F0",
    borderRightWidth: 10,
    borderTopColor: "transparent",
    borderTopWidth: 15,
    height: 0,
    left: -9,
    position: "absolute",
    top: "41%",
    width: 0,
    zIndex: 0,
  },
  speechTailFill: {
    borderBottomColor: "transparent",
    borderBottomWidth: 13,
    borderRightColor: "#F6F8FC",
    borderRightWidth: 8,
    borderTopColor: "transparent",
    borderTopWidth: 13,
    height: 0,
    left: -7,
    position: "absolute",
    top: "42%",
    width: 0,
    zIndex: 1,
  },
  speechPanel: {
    backgroundColor: "#F6F8FC",
    borderColor: "#E1E7F0",
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 164,
    paddingHorizontal: 17,
    paddingVertical: 18,
    zIndex: 2,
    ...speechShadow,
    elevation: 2,
  },
  compactSpeechPanel: {
    minHeight: 154,
    paddingHorizontal: 14,
  },
  speechTitle: {
    ...typography.assistantTitle,
    color: colors.navy,
    fontSize: 20,
    lineHeight: 25,
  },
  compactSpeechTitle: {
    fontSize: 17,
  },
  speechBody: {
    ...typography.assistantBody,
    color: colors.textSecondary,
    fontSize: 14.5,
    lineHeight: 22,
    marginTop: 10,
  },
  compactSpeechBody: {
    fontSize: 12.5,
  },
  actionsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  compactActionsRow: {
    gap: 10,
  },
  action: {
    alignItems: "center",
    borderRadius: 17,
    flex: 1,
    height: 58,
    justifyContent: "center",
    minWidth: 0,
    ...controlShadow,
  },
  actionContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  outlineAction: {
    backgroundColor: "#F6F8FC",
    borderColor: "#E1E7F0",
    borderWidth: 1,
    ...speechShadow,
    elevation: 2,
  },
  navyAction: {
    backgroundColor: colors.navy,
  },
  actionText: {
    ...typography.buttonLabel,
    color: colors.navy,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  navyActionText: {
    color: colors.surface,
  },
  pressed: {
    opacity: 0.76,
  },
});
