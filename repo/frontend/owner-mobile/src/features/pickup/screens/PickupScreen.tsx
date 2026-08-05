import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  Linking,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { describeApiError } from "../../../api/apiClient";
import { useDialog } from "../../../components/common/DialogProvider";
import type { RootTabParamList } from "../../../navigation/types";
import { appNotifications } from "../../notifications/components/NotificationsProvider";
import { colors } from "../../../theme/colors";
import { PickupCancelConfirmationModal } from "../components/PickupCancelConfirmationModal";
import { PickupCard } from "../components/PickupCard";
import { PickupHeader } from "../components/PickupHeader";
import { PickupOverviewCard } from "../components/PickupOverviewCard";
import { PickupSkeleton } from "../components/PickupSkeleton";
import { PickupStateCard } from "../components/PickupStateCard";
import type { PickupStackParamList } from "../navigation/types";
import {
  buildPickupConfirmationLines,
  confirmationSourceFromTask,
} from "../services/pickupConfirmation";
import type {
  PickupFilter,
  PickupTask,
  PickupViewState,
} from "../models/pickup";
import {
  clearPickupTask,
  confirmPickupBooking,
  failPickupTask,
  markPickupPickedUp,
  refreshPickupTasks,
  usePickupTasks,
} from "../services/pickupStore";

type PickupScreenProps = NativeStackScreenProps<
  PickupStackParamList,
  "PickupList"
>;

function PickupItemSeparator() {
  return <View style={styles.itemSeparator} />;
}

function sortPickupTasks(
  left: PickupTask,
  right: PickupTask,
  filter: PickupFilter,
) {
  if (filter === "completed") {
    const leftCompleted = new Date(
      left.completedAt ?? left.scheduledAt,
    ).getTime();
    const rightCompleted = new Date(
      right.completedAt ?? right.scheduledAt,
    ).getTime();
    return rightCompleted - leftCompleted;
  }

  // Jobs still waiting for owner approval lead the day, then by time.
  if (left.awaitingConfirmation !== right.awaitingConfirmation) {
    return left.awaitingConfirmation ? -1 : 1;
  }

  return (
    new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime()
  );
}

export function PickupScreen({ navigation }: PickupScreenProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  const compact = width <= 360;
  const pageHorizontalPadding = compact ? 12 : 14;
  const items = usePickupTasks();
  const [viewState, setViewState] = useState<PickupViewState>("loading");
  const [filter, setFilter] = useState<PickupFilter>("today");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [cancelCandidate, setCancelCandidate] = useState<PickupTask | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadPickups = useCallback(async () => {
    try {
      await refreshPickupTasks();
      setViewState("ready");
    } catch {
      setViewState("error");
    }
  }, []);

  // The schedule changes whenever a booking is confirmed or collected on another
  // tab, so it is refetched every time this tab regains focus.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      refreshPickupTasks()
        .then(() => active && setViewState("ready"))
        .catch(() => active && setViewState("error"));
      return () => {
        active = false;
      };
    }, []),
  );

  const overview = useMemo(
    () => ({
      scheduled: items.filter((item) => item.pickupStatus !== "pickedUp")
        .length,
      onRoute: items.filter((item) => item.pickupStatus === "onRoute").length,
      pickedUp: items.filter((item) => item.pickupStatus === "pickedUp").length,
    }),
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    return items
      .filter((item) => {
        if (filter === "onRoute") return item.pickupStatus === "onRoute";
        if (filter === "completed") return item.pickupStatus === "pickedUp";
        // Collected jobs belong to the Completed tab only.
        return item.filterBucket === filter && item.pickupStatus !== "pickedUp";
      })
      .filter(
        (item) =>
          !normalizedQuery ||
          [
            item.customerName,
            item.bookingCode,
            item.address,
            item.phone ?? "",
          ].some((value) => value.toLowerCase().includes(normalizedQuery)),
      )
      .sort((left, right) => sortPickupTasks(left, right, filter));
  }, [debouncedQuery, filter, items]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setFilter("today");
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPickups();
    } finally {
      setRefreshing(false);
    }
  }, [loadPickups]);

  const handleRetry = useCallback(() => {
    setViewState("loading");
    void loadPickups();
  }, [loadPickups]);

  const handleCall = useCallback(
    (item: PickupTask) => {
      if (!item.phone) return;
      Linking.openURL(`tel:${item.phone}`).catch(() =>
        dialog.notify({
          message: "This device cannot open the phone dialer.",
          title: "Call unavailable",
          tone: "warning",
        }),
      );
    },
    [dialog],
  );

  const handleDirections = useCallback(
    (item: PickupTask) => {
      navigation.navigate("PickupLocation", { pickupId: item.id });
    },
    [navigation],
  );

  const handleMarkPickedUp = useCallback(
    async (id: string) => {
      const task = items.find((item) => item.id === id);
      if (!task) return;

      const accepted = await dialog.confirm({
        bullets: buildPickupConfirmationLines(confirmationSourceFromTask(task)),
        confirmLabel: "Mark Picked Up",
        message:
          "Check this against the bags before you confirm. The customer is notified and the order moves into processing.",
        title: "Mark this pickup collected?",
      });
      if (!accepted) return;

      try {
        await markPickupPickedUp(id);
      } catch (error) {
        await dialog.notify({
          message: describeApiError(error, "Please try again."),
          title: "Unable to update pickup",
          tone: "danger",
        });
      }
    },
    [dialog, items],
  );

  const handleConfirmBooking = useCallback(
    async (task: PickupTask) => {
      const accepted = await dialog.confirm({
        bullets: buildPickupConfirmationLines(confirmationSourceFromTask(task)),
        confirmLabel: "Confirm Booking",
        message:
          "This customer booking is still waiting for your approval. Confirming it keeps the job on the pickup schedule and notifies the customer.",
        title: `Confirm ${task.bookingCode}?`,
      });
      if (!accepted) return;

      try {
        await confirmPickupBooking(task.id);
      } catch (error) {
        await dialog.notify({
          message: describeApiError(error, "Please try again."),
          title: "Unable to confirm booking",
          tone: "danger",
        });
      }
    },
    [dialog],
  );

  const handleClear = useCallback(
    async (task: PickupTask) => {
      const accepted = await dialog.confirm({
        bullets: [`${task.bookingCode} · ${task.customerName}`],
        confirmLabel: "Clear",
        message:
          "This finished job is removed from the pickup list. Sales, receipts, and history keep the record.",
        title: "Clear this pickup?",
        tone: "warning",
      });
      if (!accepted) return;

      try {
        await clearPickupTask(task.id);
      } catch (error) {
        await dialog.notify({
          message: describeApiError(error, "Please try again."),
          title: "Unable to clear pickup",
          tone: "danger",
        });
      }
    },
    [dialog],
  );

  const handleConfirmCancel = useCallback(() => {
    if (!cancelCandidate) return;
    const id = cancelCandidate.id;
    setCancelCandidate(null);
    void failPickupTask(id).catch((error) =>
      dialog.notify({
        message: describeApiError(error, "Please try again."),
        title: "Unable to cancel pickup",
        tone: "danger",
      }),
    );
  }, [cancelCandidate, dialog]);

  const listHeader = useMemo(
    () => (
      <View>
        <PickupHeader
          compact={compact}
          filter={filter}
          onFilterChange={setFilter}
          onFilterPress={() =>
            void dialog.notify({
              message:
                "Use the progress tabs to focus today, tomorrow, on-route, or completed pickups.",
              title: "Pickup filters",
            })
          }
          onNotificationsPress={appNotifications.open}
          onProfilePress={() =>
            navigation
              .getParent<BottomTabNavigationProp<RootTabParamList>>()
              ?.navigate("Settings")
          }
          onQueryChange={setQuery}
          pageHorizontalPadding={pageHorizontalPadding}
          query={query}
          safeAreaTop={insets.top}
          width={width}
        />
        <View
          style={{ marginHorizontal: pageHorizontalPadding, marginBottom: 14 }}
        >
          <PickupOverviewCard compact={compact} {...overview} />
        </View>
      </View>
    ),
    [
      compact,
      dialog,
      filter,
      insets.top,
      navigation,
      overview,
      pageHorizontalPadding,
      query,
      width,
    ],
  );

  // Wrapped so the memoised card actually holds. These were inline arrows, which
  // are a new function identity on every render and so defeated the memo entirely.
  const rowStyle = useMemo(
    () => ({ marginHorizontal: pageHorizontalPadding }),
    [pageHorizontalPadding],
  );

  const clearTask = useCallback(
    (task: PickupTask) => void handleClear(task),
    [handleClear],
  );

  const confirmBooking = useCallback(
    (task: PickupTask) => void handleConfirmBooking(task),
    [handleConfirmBooking],
  );

  const markPickedUp = useCallback(
    (id: string) => void handleMarkPickedUp(id),
    [handleMarkPickedUp],
  );

  const renderItem = useCallback(
    ({ item }: { item: PickupTask }) => (
      <View style={rowStyle}>
        <PickupCard
          compact={compact}
          item={item}
          onCall={handleCall}
          onCancel={setCancelCandidate}
          onClear={clearTask}
          onConfirmBooking={confirmBooking}
          onDirections={handleDirections}
          onMarkPickedUp={markPickedUp}
        />
      </View>
    ),
    [
      clearTask,
      compact,
      confirmBooking,
      handleCall,
      handleDirections,
      markPickedUp,
      rowStyle,
    ],
  );

  const filtered = query.trim().length > 0 || filter !== "today";
  const listEmpty = useMemo(
    () => (
      <View style={{ marginHorizontal: pageHorizontalPadding }}>
        {viewState === "loading" ? (
          <PickupSkeleton />
        ) : viewState === "error" ? (
          <PickupStateCard kind="error" onAction={handleRetry} />
        ) : (
          <PickupStateCard
            filtered={filtered}
            kind="empty"
            onAction={clearFilters}
          />
        )}
      </View>
    ),
    [clearFilters, filtered, handleRetry, pageHorizontalPadding, viewState],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.listContent}
        data={viewState === "ready" ? filteredItems : []}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={PickupItemSeparator}
        ListEmptyComponent={listEmpty}
        ListHeaderComponent={listHeader}
        onScrollBeginDrag={Keyboard.dismiss}
        refreshControl={
          <RefreshControl
            colors={[colors.navy]}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            tintColor={colors.navy}
          />
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
      {cancelCandidate ? (
        <PickupCancelConfirmationModal
          item={cancelCandidate}
          onClose={() => setCancelCandidate(null)}
          onConfirm={handleConfirmCancel}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  itemSeparator: { height: 12 },
  listContent: { paddingBottom: 16 },
  screen: { backgroundColor: colors.background, flex: 1 },
});
