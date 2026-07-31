import type { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import { SettingsPageHeader } from "./SettingsHeaders";

interface SettingsPageScaffoldProps extends PropsWithChildren {
  onBackPress: () => void;
  subtitle?: string;
  title: string;
}

export function SettingsPageScaffold({
  children,
  onBackPress,
  subtitle,
  title,
}: SettingsPageScaffoldProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontalPadding = width <= 360 ? 12 : 14;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <SettingsPageHeader
        horizontalPadding={horizontalPadding}
        onBackPress={onBackPress}
        safeAreaTop={insets.top}
        subtitle={subtitle}
        title={title}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: horizontalPadding },
        ]}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stack}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 16,
    paddingTop: spacing.sm,
  },
  screen: { backgroundColor: colors.background, flex: 1 },
  stack: { gap: 14 },
});
