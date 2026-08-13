import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { describeApiError } from "../../../api/apiClient";
import { appDialog } from "../../../components/common/DialogProvider";
import { useAuth } from "../../auth/AuthContext";
import {
  isOwner,
  isOwnerOnlyPage,
  ownerOnlyNotice,
} from "../../auth/permissions";
import { colors } from "../../../theme/colors";
import { radii } from "../../../theme/radii";
import { spacing } from "../../../theme/spacing";
import { SettingsCard } from "../components/SettingsCard";
import { SettingsOverviewHeader } from "../components/SettingsHeaders";
import { SettingsMenuRow } from "../components/SettingsMenuRow";
import { settingsMenuSections } from "../data/settingsConfig";
import type { SettingsPageId } from "../models/settings";
import {
  getBusinessSettings,
  type BusinessSettingsDto,
} from "../services/settingsService";

interface SettingsScreenProps {
  /**
   * Where the list was scrolled to when a page was last opened from it.
   *
   * Opening a settings page unmounts this list, so it came back at the top and the owner
   * had to scroll down again to reach the next thing they wanted — which is most of the
   * list, since the page they just used is rarely the first one.
   */
  initialScrollOffset?: number;
  onOpenPage: (page: SettingsPageId) => void;
  /** Reports the offset so the flow screen can hand it back on return. */
  onScrollOffsetChange?: (offset: number) => void;
}

export function SettingsScreen({
  initialScrollOffset = 0,
  onOpenPage,
  onScrollOffsetChange,
}: SettingsScreenProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width <= 360;
  const horizontalPadding = compact ? 12 : 14;
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [business, setBusiness] = useState<BusinessSettingsDto | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const { logOut, session } = useAuth();

  // Drives the locks below. The API refuses these for staff either way; this only means
  // the app says so first instead of surfacing a raw 403.
  const owner = isOwner(session);

  const scrollRef = useRef<ScrollView>(null);
  // Whether the remembered position has already been applied for this mount.
  const offsetRestored = useRef(false);

  const loadBusiness = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      setBusiness(await getBusinessSettings());
      setLoadFailed(false);
    } catch (error) {
      // Recorded so the card can say the details are unavailable. It used to fall
      // back to a hardcoded sample name, which presented someone else's shop as the
      // owner's own and looked like their settings had been silently changed.
      setLoadFailed(true);

      if (showRefresh) {
        void appDialog.notify({
          message: describeApiError(error, "Please try again."),
          title: "Unable to refresh settings",
          tone: "danger",
        });
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    // Goes through loadBusiness so the failure is handled the same way as a pull to
    // refresh. This used to be a second, unguarded call that discarded its error and
    // set state after the screen had gone.
    void getBusinessSettings()
      .then((settings) => {
        if (!active) return;
        setBusiness(settings);
        setLoadFailed(false);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });

    return () => {
      active = false;
    };
  }, []);

  // Nothing is invented when the load fails. Until the real details arrive the card
  // says so, rather than showing a placeholder shop name that the owner would read as
  // their own settings having changed.
  const showLoadFailure = loadFailed && business === null;

  const businessName =
    business?.businessName ??
    (showLoadFailure ? "Business details unavailable" : "Loading…");

  const businessAddress =
    business?.address ??
    (showLoadFailure ? "Check your connection and try again" : "");

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        onContentSizeChange={(_, height) => {
          // Restored here rather than on mount, because the offset can only be applied
          // once the content is tall enough to hold it. Guarded by a ref so it happens on
          // the first layout only and does not fight the owner if they scroll while the
          // business details are still arriving and the content grows.
          if (offsetRestored.current) return;
          if (initialScrollOffset <= 0 || height <= initialScrollOffset) return;

          offsetRestored.current = true;
          scrollRef.current?.scrollTo({
            animated: false,
            y: initialScrollOffset,
          });
        }}
        onScroll={(event) =>
          onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)
        }
        ref={scrollRef}
        refreshControl={
          <RefreshControl
            onRefresh={() => void loadBusiness(true)}
            refreshing={refreshing}
            tintColor={colors.navy}
          />
        }
        // Often enough to keep the remembered position accurate without reporting on
        // every frame of a flick.
        scrollEventThrottle={64}
        showsVerticalScrollIndicator={false}
      >
        <SettingsOverviewHeader
          compact={compact}
          horizontalPadding={horizontalPadding}
          onNotificationsPress={() =>
            void appDialog.notify({
              message: "You have no new settings notifications.",
              title: "Notifications",
            })
          }
          onProfilePress={() => onOpenPage("profile")}
          safeAreaTop={insets.top}
        />

        <View style={[styles.body, { paddingHorizontal: horizontalPadding }]}>
          <SettingsCard style={styles.businessCard}>
            <View style={styles.businessIcon}>
              <Ionicons
                color={colors.navy}
                name="storefront-outline"
                size={32}
              />
            </View>
            <View style={styles.businessCopy}>
              <Text numberOfLines={1} style={styles.businessName}>
                {businessName}
              </Text>
              <View style={styles.addressRow}>
                <Ionicons
                  color={colors.textSecondary}
                  name="location-outline"
                  size={17}
                />
                <Text numberOfLines={2} style={styles.businessAddress}>
                  {businessAddress}
                </Text>
              </View>
              {showLoadFailure ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void loadBusiness(true)}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  <Text style={styles.retryText}>Tap to try again</Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenPage("business")}
              style={({ pressed }) => [
                styles.editButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons color={colors.navy} name="create-outline" size={18} />
              {!compact ? <Text style={styles.editLabel}>Edit</Text> : null}
            </Pressable>
          </SettingsCard>

          {settingsMenuSections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <SettingsCard>
                {section.items.map((item, index) => {
                  // Owner work stays visible but locked, so staff can see what the
                  // shop has and who to ask rather than opening a page that
                  // answers 403.
                  const locked = !owner && isOwnerOnlyPage(item.id);

                  return (
                    <SettingsMenuRow
                      isLast={index === section.items.length - 1}
                      item={item}
                      key={item.id}
                      locked={locked}
                      onPress={() =>
                        locked
                          ? void appDialog.notify({
                              message: ownerOnlyNotice.message,
                              title: ownerOnlyNotice.title,
                              tone: "info",
                            })
                          : onOpenPage(item.id)
                      }
                    />
                  );
                })}
              </SettingsCard>
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={() => setLogoutVisible(true)}
            style={({ pressed }) => [
              styles.logoutCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.logoutIcon}>
              <Ionicons
                color={colors.danger}
                name="log-out-outline"
                size={22}
              />
            </View>
            <View style={styles.logoutCopy}>
              <Text style={styles.logoutTitle}>Log Out</Text>
              <Text style={styles.logoutSubtitle}>
                Sign out from your account
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setLogoutVisible(false)}
        transparent
        visible={logoutVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}>
              <Ionicons
                color={colors.danger}
                name="log-out-outline"
                size={26}
              />
            </View>
            <Text style={styles.dialogTitle}>Log Out?</Text>
            <Text style={styles.dialogBody}>
              You will need to sign in again to access the owner app.
            </Text>
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setLogoutVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setLogoutVisible(false);
                  void logOut();
                }}
                style={styles.confirmButton}
              >
                <Text style={styles.confirmLabel}>Log Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  addressRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 5,
    marginTop: 6,
  },
  body: { gap: spacing.lg },
  businessAddress: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  businessCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 122,
    padding: spacing.md,
  },
  businessCopy: { flex: 1, minWidth: 0 },
  businessIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 28,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  businessName: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 21,
  },
  cancelButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  cancelLabel: { color: colors.navy, fontSize: 14, fontWeight: "600" },
  confirmButton: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: radii.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  confirmLabel: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    marginHorizontal: spacing.lg,
    maxWidth: 390,
    padding: spacing.lg,
    width: "100%",
  },
  dialogActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  dialogBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
  dialogIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.redSoft,
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  dialogTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: 14,
    textAlign: "center",
  },
  editButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  editLabel: { color: colors.navy, fontSize: 13, fontWeight: "600" },
  logoutCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 78,
    paddingHorizontal: spacing.md,
  },
  logoutCopy: { flex: 1 },
  logoutIcon: {
    alignItems: "center",
    backgroundColor: colors.redSoft,
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  logoutSubtitle: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
  },
  logoutTitle: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(8,35,71,0.28)",
    flex: 1,
    justifyContent: "center",
  },
  retryText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  pressed: { opacity: 0.74 },
  screen: { backgroundColor: colors.background, flex: 1 },
  scrollContent: { paddingBottom: 16 },
  section: { gap: 9 },
  sectionTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    paddingHorizontal: 2,
  },
});
