import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSheetEntrance } from "../../../components/common/useSheetEntrance";
import { colors } from "../../../theme/colors";
import { radii } from "../../../theme/radii";
import { spacing } from "../../../theme/spacing";
import type { NotificationEntry } from "../services/notificationsService";
import { getNotificationHistoryPage } from "../services/notificationsService";

interface NotificationsSheetProps {
  onClose: () => void;
  visible: boolean;
}

const extractId = (item: NotificationEntry) => item.notificationId;

/**
 * What the shop has told its customers.
 *
 * The bell used to do nothing on most screens and jump to the bookings list on the
 * rest. What it should answer is whether the customer actually heard from us, which is
 * the question the owner has when someone rings up asking where their laundry is.
 */
export function NotificationsSheet({
  onClose,
  visible,
}: NotificationsSheetProps) {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<NotificationEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  // Starts true so the first open shows a spinner without the effect having to set it
  // synchronously, which the React compiler rejects.
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!visible) return;

    let active = true;

    getNotificationHistoryPage(1)
      .then((result) => {
        if (!active) return;
        setEntries(result.entries);
        setHasMore(result.hasNextPage);
        setPage(1);
        setFailed(false);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadToken, visible]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    const next = page + 1;

    void getNotificationHistoryPage(next)
      .then((result) => {
        setPage(next);
        setHasMore(result.hasNextPage);
        setEntries((current) => {
          const seen = new Set(current.map((entry) => entry.notificationId));
          return [
            ...current,
            ...result.entries.filter(
              (entry) => !seen.has(entry.notificationId),
            ),
          ];
        });
      })
      .catch(() => undefined)
      .finally(() => setLoadingMore(false));
  }, [hasMore, loadingMore, page]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <SheetBody
        entries={entries}
        failed={failed}
        loading={loading}
        loadingMore={loadingMore}
        onClose={onClose}
        onLoadMore={loadMore}
        onRetry={() => setReloadToken((token) => token + 1)}
        safeAreaBottom={insets.bottom}
        safeAreaTop={insets.top}
      />
    </Modal>
  );
}

function SheetBody({
  entries,
  failed,
  loading,
  loadingMore,
  onClose,
  onLoadMore,
  onRetry,
  safeAreaBottom,
  safeAreaTop,
}: {
  entries: NotificationEntry[];
  failed: boolean;
  loading: boolean;
  loadingMore: boolean;
  onClose: () => void;
  onLoadMore: () => void;
  onRetry: () => void;
  safeAreaBottom: number;
  safeAreaTop: number;
}) {
  const entrance = useSheetEntrance();

  return (
    <View style={styles.backdrop}>
      <Pressable
        accessibilityLabel="Close notifications"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.backdropPress}
      />
      <Animated.View
        style={[
          styles.panel,
          {
            marginTop: safeAreaTop + spacing.xl,
            paddingBottom: Math.max(safeAreaBottom, spacing.sm),
          },
          entrance,
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              Messages sent about orders, to customers and to this shop.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color={colors.navy} name="close" size={22} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.stateBlock}>
            <ActivityIndicator color={colors.navy} />
          </View>
        ) : failed ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateTitle}>
              We couldn&apos;t load notifications.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Text style={styles.stateAction}>Try again</Text>
            </Pressable>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateTitle}>Nothing sent yet.</Text>
            <Text style={styles.stateBody}>
              Messages appear here as orders move along.
            </Text>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={entries}
            keyExtractor={extractId}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footer}>
                  <ActivityIndicator color={colors.navy} size="small" />
                </View>
              ) : null
            }
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.4}
            renderItem={({ index, item }) => (
              <NotificationRow
                isLast={index === entries.length - 1}
                item={item}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </View>
  );
}

const stateCopy: Record<NotificationEntry["state"], string> = {
  failed: "Not delivered",
  sending: "Sending",
  sent: "Sent",
  waiting: "Queued",
};

const channelIcon = {
  email: "mail-outline",
  push: "phone-portrait-outline",
  sms: "chatbubble-outline",
} as const;

const channelCopy = {
  email: "Email",
  push: "App alert",
  sms: "SMS",
} as const;

function NotificationRowComponent({
  isLast,
  item,
}: {
  isLast: boolean;
  item: NotificationEntry;
}) {
  // Only a failure is tinted. Everything else is ordinary business and does not need
  // to compete for attention.
  const failedToSend = item.state === "failed";

  return (
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      <View
        style={[
          styles.rowIcon,
          item.audience === "staff" && styles.rowIconStaff,
        ]}
      >
        <Ionicons
          color={colors.navy}
          name={channelIcon[item.channel]}
          size={17}
        />
      </View>
      <View style={styles.rowCopy}>
        <Text numberOfLines={1} style={styles.rowRecipient}>
          {item.recipientLabel}
        </Text>
        <Text numberOfLines={2} style={styles.rowMessage}>
          {item.message}
        </Text>
        <Text style={styles.rowMeta}>
          {[
            channelCopy[item.channel],
            stateCopy[item.state],
            item.orderCode,
            formatMoment(item.sentAt ?? item.createdAt),
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        {failedToSend && item.lastError ? (
          <Text numberOfLines={2} style={styles.rowError}>
            {item.lastError}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const NotificationRow = memo(NotificationRowComponent);

function formatMoment(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-PH", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(16,24,40,0.45)", flex: 1 },
  backdropPress: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  closeButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  footer: { paddingVertical: spacing.sm },
  header: {
    alignItems: "flex-start",
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  headerCopy: { flex: 1, gap: 3 },
  listContent: { paddingHorizontal: spacing.md },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    flex: 1,
    marginHorizontal: 0,
    overflow: "hidden",
  },
  pressed: { opacity: 0.7 },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowCopy: { flex: 1, gap: 2 },
  rowDivider: { borderBottomColor: colors.divider, borderBottomWidth: 1 },
  rowError: {
    color: colors.danger,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: radii.pill,
    height: 34,
    justifyContent: "center",
    marginTop: 2,
    width: 34,
  },
  // Distinguishes an alert to the shop from a message to a customer without adding a
  // second colour: the same tile in a warmer neutral.
  rowIconStaff: { backgroundColor: colors.surfaceGoldSoft },
  rowMessage: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 17 },
  rowMeta: { color: colors.textMuted, fontSize: 11.5, marginTop: 2 },
  rowRecipient: { color: colors.navy, fontSize: 14, fontWeight: "600" },
  stateAction: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  stateBlock: { alignItems: "center", padding: spacing.xl },
  stateBody: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  stateTitle: { color: colors.navy, fontSize: 15, fontWeight: "700" },
  subtitle: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 17 },
  title: { color: colors.navy, fontSize: 18, fontWeight: "700" },
});
