import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/colors";
import {
  getConnectivitySnapshot,
  subscribeToConnectivity,
  useConnectivityStatus,
} from "./connectivityStore";
import { getOfflineCacheStatus } from "./offlineCache";

function relativeLabel(timestamp: number | null) {
  if (!timestamp) return null;

  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function OfflineNotice() {
  const insets = useSafeAreaInsets();
  const connectivity = useConnectivityStatus();
  const [showDetails, setShowDetails] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const [hasSavedData, setHasSavedData] = useState(true);

  const refreshCacheStatus = useCallback(async () => {
    try {
      const status = await getOfflineCacheStatus();
      setHasSavedData(status.entryCount > 0);
      setSavedLabel(relativeLabel(status.lastUpdatedAt));
    } catch {
      // Cache inspection is informational only.
    }
  }, []);

  // Connectivity is an external system, so the sheet is opened from the store
  // subscription rather than from a render-triggered effect.
  useEffect(
    () =>
      subscribeToConnectivity(() => {
        if (getConnectivitySnapshot() !== "offline") return;
        setShowDetails(true);
        void refreshCacheStatus();
      }),
    [refreshCacheStatus],
  );

  if (connectivity !== "offline") return null;

  const bannerText = hasSavedData
    ? savedLabel
      ? `Offline · saved data from ${savedLabel}`
      : "Offline · showing saved data"
    : "Offline · no saved data yet";

  return (
    <>
      <Pressable
        accessibilityLabel={bannerText}
        accessibilityRole="button"
        onPress={() => setShowDetails(true)}
        style={[styles.banner, { top: insets.top + 8 }]}
      >
        <Ionicons color={colors.navy} name="cloud-offline-outline" size={16} />
        <Text style={styles.bannerText}>{bannerText}</Text>
      </Pressable>
      <Modal
        animationType="fade"
        onRequestClose={() => setShowDetails(false)}
        statusBarTranslucent
        transparent
        visible={showDetails}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.icon}>
              <Ionicons
                color={colors.navy}
                name="cloud-offline-outline"
                size={28}
              />
            </View>
            <Text style={styles.title}>You are working offline</Text>
            <Text style={styles.body}>
              {hasSavedData
                ? `Spinner is showing the information saved on this phone${
                    savedLabel ? ` from ${savedLabel}` : ""
                  }. It will refresh automatically once you are back online.`
                : "Nothing has been saved on this phone yet. Open Home, Bookings, Pickup, History, and Settings once while online so they stay available offline."}
            </Text>
            <View style={styles.rules}>
              <View style={styles.ruleRow}>
                <Ionicons
                  color={colors.success}
                  name="checkmark-circle"
                  size={17}
                />
                <Text style={styles.ruleText}>
                  Viewing bookings, pickups, history, reports, and settings
                </Text>
              </View>
              <View style={styles.ruleRow}>
                <Ionicons color={colors.danger} name="close-circle" size={17} />
                <Text style={styles.ruleText}>
                  New orders, status changes, and payments need a connection
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowDetails(false)}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.buttonText}>Continue offline</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0, 26, 58, 0.42)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  banner: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#FFF6DD",
    borderColor: "#F2D38A",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    maxWidth: "92%",
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: "absolute",
    zIndex: 100,
  },
  bannerText: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14.5,
    lineHeight: 22,
    marginTop: 10,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 16,
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxWidth: 420,
    padding: 24,
    width: "100%",
  },
  icon: {
    alignItems: "center",
    backgroundColor: "#EEF5FF",
    borderRadius: 18,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  pressed: { opacity: 0.85 },
  ruleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  ruleText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  rules: {
    gap: 10,
    marginTop: 16,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 18,
  },
});
