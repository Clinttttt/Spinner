import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ownerOnlyNotice } from "../../auth/permissions";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";

/**
 * Shown in place of a screen a staff account may not open.
 *
 * Says who can open it and what the account can still do, rather than refusing flatly. A
 * staff member who is told only "not allowed" reasonably assumes the app is broken or that
 * they have been given the wrong account.
 */
export function OwnerOnlyScreen({ onBackPress }: { onBackPress: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.card}>
        <View style={styles.iconTile}>
          <Ionicons color={colors.navy} name="lock-closed" size={26} />
        </View>
        <Text style={styles.title}>{ownerOnlyNotice.title}</Text>
        <Text style={styles.body}>{ownerOnlyNotice.message}</Text>
        <Pressable
          accessibilityLabel="Back to Home"
          accessibilityRole="button"
          onPress={onBackPress}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>Back to Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    marginTop: 22,
    width: "100%",
  },
  buttonText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 26,
  },
  iconTile: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  pressed: { opacity: 0.75 },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
});
