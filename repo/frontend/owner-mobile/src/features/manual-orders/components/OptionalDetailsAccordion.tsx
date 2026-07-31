import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors } from "../../../theme/colors";
import type { PreferredNotificationChannel } from "../models/manualOrder";

interface OptionalDetailsAccordionProps {
  email: string;
  notes: string;
  notification: PreferredNotificationChannel;
  onEmailChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onNotificationChange: (value: PreferredNotificationChannel) => void;
  onSpecialInstructionsChange: (value: string) => void;
  specialInstructions: string;
}

export function OptionalDetailsAccordion(props: OptionalDetailsAccordionProps) {
  const [expanded, setExpanded] = useState(false);
  const channels: PreferredNotificationChannel[] = [
    "sms",
    "email",
    "both",
    "none",
  ];

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={styles.heading}
      >
        <View style={styles.iconShell}>
          <Ionicons
            color={colors.navy}
            name="document-text-outline"
            size={19}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Optional Details</Text>
          <Text style={styles.subtitle}>
            Add notes, email, or other information.
          </Text>
        </View>
        <Ionicons
          color={colors.textSecondary}
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.body}>
          <OptionalInput
            keyboardType="email-address"
            label="Customer Email"
            onChangeText={props.onEmailChange}
            placeholder="customer@example.com"
            value={props.email}
          />
          <OptionalInput
            label="Customer Notes"
            multiline
            onChangeText={props.onNotesChange}
            placeholder="Notes from the customer"
            value={props.notes}
          />
          <OptionalInput
            label="Special Instructions"
            multiline
            onChangeText={props.onSpecialInstructionsChange}
            placeholder="Handling or service instructions"
            value={props.specialInstructions}
          />
          <Text style={styles.label}>Preferred Notification Channel</Text>
          <View style={styles.channels}>
            {channels.map((channel) => {
              const selected = props.notification === channel;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={channel}
                  onPress={() => props.onNotificationChange(channel)}
                  style={[styles.channel, selected && styles.selectedChannel]}
                >
                  <Text
                    style={[
                      styles.channelText,
                      selected && styles.selectedChannelText,
                    ]}
                  >
                    {channel === "sms"
                      ? "SMS"
                      : channel[0].toUpperCase() + channel.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function OptionalInput({
  keyboardType = "default",
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
  keyboardType?: "default" | "email-address";
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, multiline && styles.multilineInput]}
        textAlignVertical={multiline ? "top" : "center"}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    paddingTop: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  channel: {
    alignItems: "center",
    borderColor: "#E2E7ED",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  channelText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  channels: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 7 },
  copy: { flex: 1, minWidth: 0 },
  field: { marginBottom: 13 },
  heading: { alignItems: "center", flexDirection: "row", gap: 10 },
  iconShell: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 13,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  input: {
    borderColor: "#E2E7ED",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.navy,
    fontSize: 13,
    height: 46,
    marginTop: 6,
    paddingHorizontal: 12,
  },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  multilineInput: { height: 76, paddingTop: 11 },
  selectedChannel: { backgroundColor: colors.navy, borderColor: colors.navy },
  selectedChannelText: { color: colors.surface },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  title: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 21,
  },
});
