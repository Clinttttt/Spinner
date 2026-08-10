import Ionicons from "@expo/vector-icons/Ionicons";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import {
  getPushPermissionStateAsync,
  type PushPermission,
  registerForPushNotificationsAsync,
} from "../services/pushRegistration";

/**
 * Says so when this phone will not show the shop's alerts.
 *
 * Worth a permanent place in the sheet because the failure is otherwise completely
 * silent. Declining Android's notification prompt makes registration give up, so no push
 * is queued for this handset at all and the owner sees nothing anywhere to explain it.
 * The prompt is only raised at sign-in, so an owner who is already signed in never gets
 * asked again either. This has taken the shop's alerts down twice, both times with no
 * indication on screen.
 */
export function PushPermissionNotice() {
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [working, setWorking] = useState(false);

  const check = useCallback(() => {
    void getPushPermissionStateAsync().then(setPermission);
  }, []);

  // On mount, which is once per opening of the sheet: React Native's Modal does not
  // render its children while it is hidden. Granting the permission in system settings
  // and reopening therefore shows the notice gone rather than a stale warning.
  useEffect(() => {
    check();
  }, [check]);

  const enable = useCallback(async () => {
    setWorking(true);
    try {
      if (permission === "canAsk") {
        // Asking goes through the same path as sign-in, so a granted permission also
        // registers this phone straight away rather than waiting for the next launch.
        await Notifications.requestPermissionsAsync();
        await registerForPushNotificationsAsync();
      } else {
        // Android will not show the prompt again once it has been refused, so the only
        // way back is the system settings page for this app.
        await Linking.openSettings();
      }
    } catch {
      // Nothing useful to say: the notice stays, which is itself the correct state.
    } finally {
      setWorking(false);
      check();
    }
  }, [check, permission]);

  // Nothing to say while it is being read, when alerts work, or on a simulator with no
  // push service to ask.
  if (permission === null || permission === "granted") return null;
  if (permission === "unavailable") return null;

  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Ionicons color={colors.danger} name="notifications-off" size={19} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>This phone will not alert you</Text>
        <Text style={styles.body}>
          Notifications are turned off for Spinner, so new bookings will not
          reach you here. Messages to customers are unaffected.
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Turn on notifications"
        accessibilityRole="button"
        disabled={working}
        onPress={() => void enable()}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={styles.actionText}>
          {permission === "canAsk" ? "Turn on" : "Open settings"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 11,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  actionText: { color: colors.surface, fontSize: 12.5, fontWeight: "700" },
  body: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 11,
    marginBottom: 12,
    padding: 13,
  },
  copy: { flex: 1, minWidth: 0 },
  icon: {
    alignItems: "center",
    backgroundColor: "rgba(197,48,48,0.09)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  pressed: { opacity: 0.75 },
  title: { color: colors.navy, fontSize: 13.5, fontWeight: "700" },
});
