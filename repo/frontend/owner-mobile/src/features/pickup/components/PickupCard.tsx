import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PickupTask } from "../models/pickup";
import { PickupBadge } from "./PickupBadge";
import { PickupTag } from "./PickupTag";
import { pickupColors, pickupTaskCardStyle } from "./pickupTheme";

interface PickupCardProps {
  compact: boolean;
  item: PickupTask;
  onCall: (item: PickupTask) => void;
  onCancel: (item: PickupTask) => void;
  onClear: (item: PickupTask) => void;
  onConfirmBooking: (item: PickupTask) => void;
  onDirections: (item: PickupTask) => void;
  onMarkPickedUp: (id: string) => void;
}

interface IconActionProps {
  accessibilityLabel: string;
  compact: boolean;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

function IconAction({
  accessibilityLabel,
  compact,
  disabled,
  icon,
  onPress,
}: IconActionProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={2}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryAction,
        compact && styles.compactSecondaryAction,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons color={pickupColors.textPrimary} name={icon} size={21} />
    </Pressable>
  );
}

export function PickupCard({
  compact,
  item,
  onCall,
  onCancel,
  onClear,
  onConfirmBooking,
  onDirections,
  onMarkPickedUp,
}: PickupCardProps) {
  const completed = item.pickupStatus === "pickedUp";
  const awaitingConfirmation = item.awaitingConfirmation;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.avatar}
        >
          <Ionicons
            color={pickupColors.textPrimary}
            name="person-outline"
            size={26}
          />
        </View>

        <View style={styles.mainContent}>
          <View
            style={[styles.headingRow, compact && styles.compactHeadingRow]}
          >
            <Text
              ellipsizeMode="tail"
              numberOfLines={1}
              style={styles.customerName}
            >
              {item.customerName}
            </Text>
            <View style={styles.badges}>
              <PickupBadge compact={compact} value={item.paymentStatus} />
              <PickupBadge
                compact={compact}
                value={
                  awaitingConfirmation ? "needsConfirmation" : item.pickupStatus
                }
              />
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.timeGroup}>
              <Ionicons
                color={pickupColors.textSecondary}
                name="time-outline"
                size={16}
              />
              <Text style={styles.time}>{item.timeLabel}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.addressGroup}>
              <Ionicons
                color={pickupColors.textSecondary}
                name="location-outline"
                size={16}
              />
              <Text numberOfLines={2} style={styles.address}>
                {item.address}
              </Text>
            </View>
          </View>

          <View style={styles.tags}>
            {item.services.map((service) => (
              <PickupTag
                compact={compact}
                key={service.id}
                service={service}
                serviceCount={item.services.length}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.actionDivider} />

      <View style={styles.actionsRow}>
        <IconAction
          accessibilityLabel={`Call ${item.customerName}`}
          compact={compact}
          disabled={!item.phone}
          icon="call-outline"
          onPress={() => onCall(item)}
        />
        <IconAction
          accessibilityLabel={`View pickup location for ${item.customerName}`}
          compact={compact}
          disabled={!item.id}
          icon="navigate-outline"
          onPress={() => onDirections(item)}
        />
        {!completed ? (
          <IconAction
            accessibilityLabel={`Cancel pickup for ${item.customerName}`}
            compact={compact}
            icon="close-circle-outline"
            onPress={() => onCancel(item)}
          />
        ) : null}
        {item.canClear ? (
          <IconAction
            accessibilityLabel={`Clear ${item.bookingCode} from the pickup list`}
            compact={compact}
            icon="trash-outline"
            onPress={() => onClear(item)}
          />
        ) : null}
        <Pressable
          accessibilityLabel={
            awaitingConfirmation
              ? `Confirm booking ${item.bookingCode} for ${item.customerName}`
              : completed
                ? `${item.customerName} has been picked up`
                : `Mark ${item.customerName} as picked up`
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: completed }}
          disabled={completed}
          onPress={() =>
            awaitingConfirmation
              ? onConfirmBooking(item)
              : onMarkPickedUp(item.id)
          }
          style={({ pressed }) => [
            styles.primaryAction,
            compact && styles.compactPrimaryAction,
            completed ? styles.completedAction : styles.activeAction,
            pressed && styles.pressed,
          ]}
        >
          {completed ? (
            <Ionicons
              color={pickupColors.textPrimary}
              name="checkmark-circle-outline"
              size={19}
            />
          ) : null}
          <Text
            numberOfLines={1}
            style={[styles.primaryText, completed && styles.completedText]}
          >
            {awaitingConfirmation ? "Confirm" : "Picked Up"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...pickupTaskCardStyle,
    alignSelf: "stretch",
    paddingBottom: 14,
    paddingHorizontal: 14,
    paddingTop: 14,
    width: "100%",
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  avatar: {
    alignItems: "center",
    backgroundColor: pickupColors.surfaceSoft,
    borderColor: pickupColors.border,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
    height: 48,
    justifyContent: "center",
    width: 52,
  },
  mainContent: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
    justifyContent: "space-between",
  },
  compactHeadingRow: { alignItems: "center" },
  customerName: {
    color: pickupColors.textPrimary,
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 14.5,
    fontWeight: "700",
    lineHeight: 19,
    minWidth: 0,
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 7,
    marginLeft: "auto",
  },
  metaRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    marginTop: 8,
    minWidth: 0,
  },
  timeGroup: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 5,
  },
  time: {
    color: pickupColors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
  },
  metaDivider: {
    backgroundColor: pickupColors.borderStrong,
    height: 18,
    marginHorizontal: 7,
    width: StyleSheet.hairlineWidth,
  },
  addressGroup: {
    alignItems: "flex-start",
    flex: 1,
    flexDirection: "row",
    gap: 4,
    minWidth: 0,
  },
  address: {
    color: pickupColors.textSecondary,
    flex: 1,
    fontSize: 11.5,
    lineHeight: 15,
    minWidth: 0,
  },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: 7,
    marginTop: 12,
  },
  actionDivider: {
    backgroundColor: pickupColors.borderStrong,
    height: StyleSheet.hairlineWidth,
    marginBottom: 12,
    marginTop: 14,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: pickupColors.surface,
    borderColor: pickupColors.borderStrong,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  compactSecondaryAction: {
    height: 48,
    width: 52,
  },
  primaryAction: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    height: 48,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 10,
  },
  compactPrimaryAction: {
    height: 48,
  },
  activeAction: {
    backgroundColor: pickupColors.primaryAction,
    borderColor: pickupColors.primaryAction,
  },
  completedAction: {
    backgroundColor: pickupColors.surfaceSoft,
    borderColor: pickupColors.borderStrong,
  },
  primaryText: {
    color: pickupColors.surface,
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 18,
  },
  completedText: {
    color: pickupColors.textPrimary,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.72,
  },
});
