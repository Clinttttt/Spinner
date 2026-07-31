import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";

import { colors } from "../../../theme/colors";
import { radii } from "../../../theme/radii";

interface SettingsFieldProps {
  editable?: boolean;
  keyboardType?: KeyboardTypeOptions;
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  value: string;
}

export function SettingsField({
  editable = true,
  keyboardType,
  label,
  multiline,
  onChangeText,
  placeholder,
  secureTextEntry,
  value,
}: SettingsFieldProps) {
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputFrame, multiline && styles.multilineFrame]}>
        <TextInput
          autoCapitalize={
            keyboardType === "email-address" ? "none" : "sentences"
          }
          editable={editable}
          keyboardType={keyboardType}
          multiline={multiline}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden}
          style={[
            styles.input,
            multiline && styles.multilineInput,
            !editable && styles.readOnlyInput,
          ]}
          value={value}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setHidden((current) => !current)}
          >
            <Ionicons
              color={colors.textSecondary}
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={20}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 6 },
  input: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    minWidth: 0,
    padding: 0,
  },
  inputFrame: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  label: {
    color: colors.neutralText,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  multilineFrame: {
    alignItems: "flex-start",
    minHeight: 86,
    paddingVertical: 13,
  },
  multilineInput: { minHeight: 58, textAlignVertical: "top" },
  readOnlyInput: { color: colors.textSecondary },
});
