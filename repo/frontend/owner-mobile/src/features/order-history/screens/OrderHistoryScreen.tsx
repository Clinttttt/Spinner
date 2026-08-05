import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootTabParamList } from "../../../navigation/types";
import { appNotifications } from "../../notifications/components/NotificationsProvider";
import { colors } from "../../../theme/colors";
import { OrderHistoryHeader } from "../components/OrderHistoryHeader";
import { OrderHistoryRow } from "../components/OrderHistoryRow";
import type {
  OrderHistoryEntry,
  OrderHistoryFilter,
  OrderHistoryViewState,
} from "../models/orderHistory";
import {
  getOrderHistoryPage,
  matchesOrderHistoryFilter,
} from "../services/orderHistoryService";

type OrderHistoryScreenProps = BottomTabScreenProps<
  RootTabParamList,
  "OrderHistory"
>;

const extractOrderId = (item: OrderHistoryEntry) => item.orderId;

/**
 * The shop's ledger of orders.
 *
 * Exists because opening a sale from Transaction History used to drop the owner on
 * the Bookings tab, which shows current work and had usually already cleared the
 * order they were looking for. Reached with an order code, this lands on that order
 * with its details open.
 */
export function OrderHistoryScreen({
  navigation,
  route,
}: OrderHistoryScreenProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width <= 360;
  const pagePadding = compact ? 12 : 14;

  const requestedOrderCode = route.params?.orderCode ?? "";

  const [query, setQuery] = useState(requestedOrderCode);
  const [debouncedQuery, setDebouncedQuery] = useState(requestedOrderCode);
  const [filter, setFilter] = useState<OrderHistoryFilter>("all");
  const [entries, setEntries] = useState<OrderHistoryEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(
    requestedOrderCode || null,
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewState, setViewState] = useState<OrderHistoryViewState>("loading");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  // Search is sent to the server, so a new term is a new first page rather than a
  // filter over what happens to be loaded.
  useEffect(() => {
    let active = true;

    getOrderHistoryPage({ page: 1, search: debouncedQuery })
      .then((result) => {
        if (!active) return;
        setEntries(result.entries);
        setHasMore(result.hasNextPage);
        setPage(1);
        setViewState("ready");
      })
      .catch(() => {
        if (active) setViewState("error");
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, reloadToken]);

  const reload = useCallback(() => {
    setRefreshing(true);
    setReloadToken((token) => token + 1);
  }, []);

  const retry = useCallback(() => {
    setViewState("loading");
    setReloadToken((token) => token + 1);
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    const next = page + 1;

    void getOrderHistoryPage({ page: next, search: debouncedQuery })
      .then((result) => {
        setPage(next);
        setHasMore(result.hasNextPage);
        setEntries((current) => {
          // An order closed between requests shifts the list, which would otherwise
          // repeat a row and collide on its key.
          const seen = new Set(current.map((entry) => entry.orderId));
          return [
            ...current,
            ...result.entries.filter((entry) => !seen.has(entry.orderId)),
          ];
        });
      })
      // Swallowed on purpose: the rows already shown are still good, and interrupting
      // a scroll with a dialog over a page that can simply be fetched again is worse.
      .catch(() => undefined)
      .finally(() => setLoadingMore(false));
  }, [debouncedQuery, hasMore, loadingMore, page]);

  const toggleExpanded = useCallback((orderCode: string) => {
    setExpanded((current) => (current === orderCode ? null : orderCode));
  }, []);

  const goBack = useCallback(
    () => navigation.navigate("TransactionHistory"),
    [navigation],
  );
  const goToSettings = useCallback(
    () => navigation.navigate("Settings"),
    [navigation],
  );

  // Status and payment are not date or text filters, so the report endpoint cannot
  // apply them. This narrows the loaded page rather than a copy of everything.
  const visible = useMemo(
    () => entries.filter((entry) => matchesOrderHistoryFilter(entry, filter)),
    [entries, filter],
  );

  const isNarrowed = debouncedQuery.length > 0 || filter !== "all";
  const nothingToShow = viewState === "ready" && visible.length === 0;
  const hasRows = viewState === "ready" && visible.length > 0;

  const listHeader = useMemo(
    () => (
      <>
        <OrderHistoryHeader
          compact={compact}
          filter={filter}
          horizontalPadding={pagePadding}
          onBackPress={goBack}
          onFilterChange={setFilter}
          onNotificationsPress={appNotifications.open}
          onProfilePress={goToSettings}
          onQueryChange={setQuery}
          query={query}
          safeAreaTop={insets.top}
          width={width}
        />
        <View style={{ paddingHorizontal: pagePadding }}>
          {viewState === "loading" ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={colors.navy} />
              <Text style={styles.stateBody}>Loading order history...</Text>
            </View>
          ) : null}
          {viewState === "error" ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>
                We couldn&apos;t load order history.
              </Text>
              <Text style={styles.stateBody}>
                Check your connection and try again.
              </Text>
              <Text
                accessibilityRole="button"
                onPress={retry}
                style={styles.stateAction}
              >
                Try again
              </Text>
            </View>
          ) : null}
          {nothingToShow ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>
                {isNarrowed ? "No orders match this view." : "No orders yet."}
              </Text>
              <Text style={styles.stateBody}>
                {isNarrowed
                  ? "Try a different search or filter."
                  : "Orders appear here as soon as the shop takes them."}
              </Text>
            </View>
          ) : null}
          {hasRows ? (
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>Orders</Text>
              <Text style={styles.cardCount}>
                {visible.length} shown{hasMore ? ", more below" : ""}
              </Text>
            </View>
          ) : null}
        </View>
      </>
    ),
    [
      compact,
      filter,
      goBack,
      goToSettings,
      hasMore,
      hasRows,
      insets.top,
      isNarrowed,
      nothingToShow,
      pagePadding,
      query,
      retry,
      viewState,
      visible.length,
      width,
    ],
  );

  const listFooter = useMemo(
    () =>
      hasRows ? (
        <View style={{ paddingHorizontal: pagePadding }}>
          <View style={styles.cardBottom}>
            {loadingMore ? (
              <ActivityIndicator color={colors.navy} size="small" />
            ) : null}
          </View>
        </View>
      ) : null,
    [hasRows, loadingMore, pagePadding],
  );

  const renderRow = useCallback(
    ({ index, item }: { index: number; item: OrderHistoryEntry }) => (
      <View style={{ paddingHorizontal: pagePadding }}>
        <View style={styles.cardBody}>
          <OrderHistoryRow
            compact={compact}
            expanded={expanded === item.orderCode}
            isLast={index === visible.length - 1 && !hasMore}
            item={item}
            onToggle={toggleExpanded}
          />
        </View>
      </View>
    ),
    [compact, expanded, hasMore, pagePadding, toggleExpanded, visible.length],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="never"
        data={hasRows ? visible : []}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={extractOrderId}
        ListFooterComponent={listFooter}
        ListHeaderComponent={listHeader}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            colors={[colors.navy]}
            onRefresh={reload}
            refreshing={refreshing}
            tintColor={colors.navy}
          />
        }
        renderItem={renderRow}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // The card is drawn in three parts so its rows can be virtualised while the surface
  // still reads as one panel, matching Transaction History.
  cardBody: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  cardBottom: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  cardCount: { color: colors.textSecondary, fontSize: 12.5, marginTop: 2 },
  cardTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
  },
  cardTop: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  listContent: { paddingBottom: 18 },
  screen: { backgroundColor: colors.background, flex: 1 },
  stateAction: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
  },
  stateBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    textAlign: "center",
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
  },
  stateTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
});
