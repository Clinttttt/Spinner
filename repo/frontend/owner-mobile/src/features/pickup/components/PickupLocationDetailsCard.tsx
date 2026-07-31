import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors } from "../../../theme/colors";
import type { PickupLocationDetails } from "../models/pickupLocation";

interface PickupLocationDetailsCardProps {
  compact: boolean;
  details: PickupLocationDetails;
  onCall: () => void;
  onCopy: () => void;
  onOpenMaps: () => void;
  onPrimaryAction: () => void;
  submitting: boolean;
}

interface ActionButtonProps {
  accessibilityLabel: string;
  disabled?: boolean;
  emphasized?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  wide?: boolean;
}

function ActionButton({
  accessibilityLabel,
  disabled,
  emphasized,
  icon,
  label,
  onPress,
  wide,
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryAction,
        wide && styles.wideAction,
        emphasized && styles.emphasizedAction,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        color={emphasized ? colors.surface : colors.navy}
        name={icon}
        size={18}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.secondaryActionText,
          emphasized && styles.emphasizedActionText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function locationStatusCopy(details: PickupLocationDetails) {
  switch (details.location.status) {
    case "confirmed":
      return {
        color: colors.success,
        icon: "checkmark-circle-outline" as const,
        label: "Location confirmed",
      };
    case "needsConfirmation":
      return {
        color: colors.goldText,
        icon: "alert-circle-outline" as const,
        label: "Location needs confirmation",
      };
    case "missingCoordinates":
      return {
        color: colors.textSecondary,
        icon: "location-outline" as const,
        label: "Coordinates missing",
      };
    default:
      return {
        color: colors.textSecondary,
        icon: "cloud-offline-outline" as const,
        label: "Location unavailable",
      };
  }
}

function formatCoordinate(
  value: number | undefined,
  positive: string,
  negative: string,
) {
  if (!Number.isFinite(value)) return null;
  return `${Math.abs(value!).toFixed(4)}° ${value! >= 0 ? positive : negative}`;
}

export function PickupLocationDetailsCard({
  compact,
  details,
  onCall,
  onCopy,
  onOpenMaps,
  onPrimaryAction,
  submitting,
}: PickupLocationDetailsCardProps) {
  const status = locationStatusCopy(details);
  const latitude = formatCoordinate(details.location.latitude, "N", "S");
  const longitude = formatCoordinate(details.location.longitude, "E", "W");
  const coordinates =
    latitude && longitude ? `${latitude}, ${longitude}` : null;
  const hasCoordinates =
    Number.isFinite(details.location.latitude) &&
    Number.isFinite(details.location.longitude);
  const completed = details.pickupStatus === "pickedUp";
  const primaryLabel = completed
    ? "Pickup Completed"
    : details.awaitingConfirmation
      ? "Confirm Booking"
      : details.pickupStatus === "onRoute"
        ? "Mark Picked Up"
        : "Mark On Route";

  return (
    <View style={[styles.card, compact && styles.compactCard]}>
      <View style={styles.addressBlock}>
        <View style={styles.locationIcon}>
          <Ionicons color={colors.navy} name="location" size={22} />
        </View>
        <View style={styles.addressCopy}>
          <Text style={styles.address}>
            {details.location.formattedAddress || details.shortAddress}
          </Text>
          {details.location.landmark ? (
            <Text style={styles.landmark}>
              Landmark: {details.location.landmark}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.statusRow}>
        <Ionicons color={status.color} name={status.icon} size={17} />
        <Text style={[styles.statusText, { color: status.color }]}>
          {status.label}
        </Text>
      </View>

      {details.location.status === "needsConfirmation" ? (
        <Text style={styles.guidance}>
          Contact the customer before navigating.
        </Text>
      ) : null}
      {!hasCoordinates ? (
        <Text style={styles.guidance}>
          No map coordinates available. Use the address or contact the customer.
        </Text>
      ) : null}
      {coordinates ? (
        <View style={styles.coordinatesRow}>
          <Ionicons color={colors.textMuted} name="locate-outline" size={15} />
          <Text style={styles.coordinates}>{coordinates}</Text>
        </View>
      ) : null}
      {!details.distanceMeters || !details.estimatedTravelMinutes ? (
        <Text style={styles.routingFallback}>
          Distance and travel time will appear when route data is available.
        </Text>
      ) : null}

      <View style={[styles.actions, compact && styles.compactActions]}>
        <ActionButton
          accessibilityLabel={`Call ${details.customerName}`}
          disabled={!details.customerPhone}
          icon="call-outline"
          label="Call"
          onPress={onCall}
        />
        <ActionButton
          accessibilityLabel="Copy pickup address"
          disabled={!details.location.formattedAddress && !details.shortAddress}
          icon="copy-outline"
          label="Copy"
          onPress={onCopy}
        />
        <ActionButton
          accessibilityLabel="Open pickup location in Maps"
          disabled={!hasCoordinates}
          emphasized
          icon="map-outline"
          label="Open in Maps"
          onPress={onOpenMaps}
          wide={compact}
        />
      </View>

      <Pressable
        accessibilityLabel={primaryLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: completed || submitting }}
        disabled={completed || submitting}
        onPress={onPrimaryAction}
        style={({ pressed }) => [
          styles.primaryAction,
          completed && styles.completedAction,
          pressed && styles.pressed,
        ]}
      >
        {submitting ? (
          <ActivityIndicator color={colors.surface} size="small" />
        ) : (
          <Ionicons
            color={completed ? colors.navy : colors.surface}
            name={completed ? "checkmark-circle-outline" : "car-outline"}
            size={20}
          />
        )}
        <Text style={[styles.primaryText, completed && styles.completedText]}>
          {submitting ? "Updating pickup…" : primaryLabel}
        </Text>
      </Pressable>

      <View style={styles.notice}>
        <Ionicons
          color={colors.goldText}
          name="information-circle-outline"
          size={17}
        />
        <Text style={styles.noticeText}>
          Use Open in Maps for turn-by-turn navigation.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  address: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  addressBlock: { alignItems: "flex-start", flexDirection: "row", gap: 11 },
  addressCopy: { flex: 1, minWidth: 0 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  compactCard: { borderRadius: 18, padding: 12 },
  compactActions: { flexWrap: "wrap" },
  completedAction: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  completedText: { color: colors.navy },
  coordinates: {
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 16,
  },
  coordinatesRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 9,
  },
  disabled: { opacity: 0.45 },
  emphasizedAction: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
    flexGrow: 1.25,
  },
  emphasizedActionText: { color: colors.surface },
  guidance: {
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 17,
    marginLeft: 24,
    marginTop: 4,
  },
  landmark: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  locationIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 18,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  notice: {
    alignItems: "center",
    backgroundColor: colors.surfaceGoldSoft,
    borderColor: "rgba(201,138,0,0.25)",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  noticeText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderColor: colors.navy,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: 52,
    justifyContent: "center",
    marginTop: 12,
  },
  primaryText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "700",
  },
  routingFallback: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 15,
    marginTop: 9,
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#DDE3EA",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    height: 46,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 8,
  },
  secondaryActionText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "600",
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginLeft: 53,
    marginTop: 10,
  },
  statusText: { fontSize: 11.5, fontWeight: "600", lineHeight: 16 },
  wideAction: { flexBasis: "100%", flexGrow: 0 },
});
