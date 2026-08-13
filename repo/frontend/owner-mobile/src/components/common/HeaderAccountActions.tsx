import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../features/auth/AuthContext";
import { useAccountPhoto } from "../../features/auth/services/accountPhotoStore";
import {
  hasUnreadNotifications,
  useOperationsCounts,
} from "../../features/operations/operationsCountsStore";
import { colors } from "../../theme/colors";
import { radii } from "../../theme/radii";

const transactionIcon = require("../../../assets/transactions/transaction-icon.png");

interface HeaderAccountActionsProps {
  primaryAction?: "addTransaction" | "notifications";
  onNotificationsPress: () => void;
  onProfilePress: () => void;
}

export function HeaderAccountActions({
  primaryAction = "notifications",
  onNotificationsPress,
  onProfilePress,
}: HeaderAccountActionsProps) {
  const isAddTransaction = primaryAction === "addTransaction";

  const { session } = useAuth();
  const { photoUrl } = useAccountPhoto();

  // Subscribed for the re-render, not the value: the dot reads acknowledged counts
  // through the store, and this is what redraws the bell when either side changes.
  useOperationsCounts();

  // The dot used to be part of the bell's styling, so it was on permanently and told
  // the owner nothing. It now appears only when the notification log has messages that
  // have arrived since the sheet was last opened.
  const unread = !isAddTransaction && hasUnreadNotifications();

  // Up to two letters, which is what fits the ring. Falls back to a person glyph rather than
  // showing an empty circle while the session is still being restored.
  const initials = useMemo(() => {
    const name = session?.fullName?.trim() ?? "";
    if (!name) return "";

    const parts = name.split(/\s+/).filter(Boolean);
    const letters =
      parts.length === 1
        ? parts[0].slice(0, 2)
        : `${parts[0][0]}${parts[parts.length - 1][0]}`;

    return letters.toUpperCase();
  }, [session]);

  return (
    <View style={styles.actions}>
      <Pressable
        accessibilityLabel={
          isAddTransaction
            ? "Add transaction"
            : unread
              ? "Notifications, new messages"
              : "Notifications"
        }
        accessibilityRole="button"
        hitSlop={6}
        onPress={onNotificationsPress}
        style={({ pressed }) => [
          styles.primaryActionButton,
          isAddTransaction
            ? styles.addTransactionButton
            : styles.bellButtonFrame,
          pressed && styles.pressed,
        ]}
      >
        {isAddTransaction ? (
          <Image
            accessibilityIgnoresInvertColors
            fadeDuration={0}
            resizeMode="contain"
            source={transactionIcon}
            style={styles.transactionIcon}
          />
        ) : (
          <Ionicons
            color={colors.navy}
            name="notifications-outline"
            size={27}
          />
        )}
        {unread ? <View pointerEvents="none" style={styles.unreadDot} /> : null}
      </Pressable>

      {!isAddTransaction ? (
        <Pressable
          accessibilityLabel="Owner profile"
          accessibilityRole="button"
          hitSlop={4}
          onPress={onProfilePress}
          style={({ pressed }) => [
            styles.profileButton,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.profileFrame}>
            {/*
              The signed-in person's picture, or their initials.
              
              This was a photograph bundled with the app, which meant every account saw the
              same face: a staff member signing in was shown the owner's photo as though it
              were their own. Now it is either the photo they uploaded themselves or their
              initials from the session, so the avatar is whoever is actually signed in, and
              nobody's likeness ships inside the binary.
            */}
            {photoUrl ? (
              <Image
                accessibilityIgnoresInvertColors
                fadeDuration={0}
                resizeMode="cover"
                source={{ uri: photoUrl }}
                style={styles.profilePhoto}
              />
            ) : (
              <Text style={styles.profileInitials}>{initials}</Text>
            )}
          </View>
          <View pointerEvents="none" style={styles.profileBadge}>
            <Ionicons color={colors.actionBlue} name="scan-outline" size={15} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  primaryActionButton: {
    alignItems: "center",
    height: 50,
    justifyContent: "center",
    position: "relative",
    width: 50,
  },
  /**
   * A quiet ring so the bell reads as a button.
   *
   * It sat bare next to the gold-ringed profile photo, which made the pair look
   * unbalanced. Deliberately neutral rather than gold: two gold rings side by side
   * would compete, and this is chrome, not a call to action.
   */
  bellButtonFrame: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(13,42,82,0.12)",
    borderRadius: 25,
    borderWidth: 1,
  },
  addTransactionButton: {
    backgroundColor: "transparent",
    borderWidth: 0,
    elevation: 0,
    height: 58,
    width: 58,
  },
  unreadDot: {
    backgroundColor: colors.goldStrong,
    borderColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 13,
    position: "absolute",
    right: -1,
    top: -1,
    width: 13,
  },
  profileButton: {
    alignItems: "center",
    height: 58,
    justifyContent: "center",
    position: "relative",
    width: 58,
  },
  profileFrame: {
    alignItems: "center",
    // A soft fill so the initials sit on something, where the photograph used to provide
    // its own background.
    backgroundColor: colors.blueSoft,
    borderColor: "rgba(201,138,0,0.72)",
    borderRadius: 28,
    borderWidth: 1.25,
    elevation: 2,
    height: 56,
    justifyContent: "center",
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    width: 56,
  },
  profileInitials: {
    color: colors.navy,
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  // Fills the ring completely. Slightly smaller than the frame so the gold border stays
  // visible all the way round rather than being covered by the image's corners.
  profilePhoto: {
    borderRadius: 26,
    height: 53,
    width: 53,
  },
  transactionIcon: { height: 68, width: 68 },
  profileBadge: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "rgba(23,92,211,0.12)",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    top: -2,
    width: 22,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
});
