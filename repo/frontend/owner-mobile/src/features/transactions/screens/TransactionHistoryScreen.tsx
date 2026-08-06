import Ionicons from "@expo/vector-icons/Ionicons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appDialog } from "../../../components/common/DialogProvider";
import type { RootTabParamList } from "../../../navigation/types";
import { appNotifications } from "../../notifications/components/NotificationsProvider";
import { colors } from "../../../theme/colors";
import { TransactionHistoryHeader } from "../components/TransactionHistoryHeader";
import { TransactionRow } from "../components/TransactionRow";
import {
  transactionSortLabels,
  TransactionSortModal,
} from "../components/TransactionSortModal";
import {
  TransactionSkeleton,
  TransactionStateCard,
} from "../components/TransactionStates";
import type {
  TransactionFilter,
  TransactionHistoryItem,
  TransactionHistoryViewState,
  TransactionSort,
} from "../models/transaction";
import {
  hasRestoredSeenTransactions,
  markAllTransactionsSeen,
  markTransactionSeen,
  restoreSeenTransactions,
  useSeenTransactions,
} from "../services/seenTransactionsStore";
import {
  loadMoreTransactions,
  loadTransactions,
  useTransactionsState,
} from "../services/transactionStore";

type TransactionHistoryScreenProps = BottomTabScreenProps<
  RootTabParamList,
  "TransactionHistory"
>;

// Searching, filtering and sorting are all done by the server now, so the helpers
// that used to do it over a full local copy of the history have been removed.

const extractTransactionId = (item: TransactionHistoryItem) => item.id;

export function TransactionHistoryScreen({
  navigation,
}: TransactionHistoryScreenProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    hasMore,
    items: visibleTransactions,
    loadingMore,
  } = useTransactionsState();
  const compact = width <= 360;
  const pageHorizontalPadding = compact ? 12 : 14;
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [sort, setSort] = useState<TransactionSort>("latest");
  const [sortVisible, setSortVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewState, setViewState] =
    useState<TransactionHistoryViewState>("loading");
  const seenTransactions = useSeenTransactions();
  // Only the very first list becomes the baseline, not every refetch.
  const baselineApplied = useRef(hasRestoredSeenTransactions());

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedQuery(query.trim().toLowerCase()),
      300,
    );
    return () => clearTimeout(timeout);
  }, [query]);

  // Searching, filtering and sorting all happen on the server, so a change to any of
  // them is a new first page rather than a re-filter of everything downloaded so far.
  useEffect(() => {
    let active = true;

    loadTransactions({ filter, search: debouncedQuery, sort })
      .then((state) => {
        if (!active) return;
        setViewState("ready");

        // On a fresh install nothing has been opened, and marking the shop's entire
        // trading history as unread says nothing useful — it just makes the screen look
        // unattended. The first list the owner ever sees becomes the baseline, and only
        // what arrives after that stands out.
        void restoreSeenTransactions().then(() => {
          if (!active) return;
          if (!baselineApplied.current) {
            baselineApplied.current = true;
            markAllTransactionsSeen(state.items.map((item) => item.id));
          }
        });
      })
      .catch(() => {
        if (active) setViewState("error");
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, filter, sort]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTransactions({ filter, search: debouncedQuery, sort });
      setViewState("ready");
    } catch {
      setViewState("error");
    } finally {
      setRefreshing(false);
    }
  }, [debouncedQuery, filter, sort]);

  // Fetches the next page as the owner nears the end of what is loaded. A failure is
  // swallowed deliberately: the rows already on screen are still valid, and throwing
  // a dialog at somebody mid-scroll over a page that can simply be retried is worse
  // than doing nothing.
  const handleEndReached = useCallback(() => {
    if (!hasMore || loadingMore) return;
    void loadMoreTransactions().catch(() => undefined);
  }, [hasMore, loadingMore]);

  const openTransaction = useCallback(
    (item: TransactionHistoryItem) => {
      // Opened, so it stops standing out next time.
      markTransactionSeen(item.id);

      // Opens the order in the history ledger, with its details showing. This used to
      // navigate to the Bookings or Orders tab, which lists current work — so the
      // order being looked for had usually already been cleared from it, and the tap
      // appeared to do nothing useful.
      if (item.orderCode) {
        navigation.navigate("OrderHistory", { orderCode: item.orderCode });
      }
    },
    [navigation],
  );

  // Stable identities, so the memoised header is not rebuilt — with its images,
  // icons and filter chips — every time the list re-renders.
  const goToSettings = useCallback(
    () => navigation.navigate("Settings"),
    [navigation],
  );
  const openSort = useCallback(() => setSortVisible(true), []);
  const closeSort = useCallback(() => setSortVisible(false), []);

  const showFilterHint = useCallback(() => {
    void appDialog.notify({
      message: "Use the quick filters below the search field.",
      title: "Transaction filters",
    });
  }, []);

  const handleRetry = useCallback(() => {
    setViewState("loading");
    void loadTransactions({ filter, search: debouncedQuery, sort })
      .then(() => setViewState("ready"))
      .catch(() => setViewState("error"));
  }, [debouncedQuery, filter, sort]);

  // With filtering done on the server there is no local copy of everything to
  // compare against, so "nothing here yet" is told apart from "nothing matched" by
  // whether the owner has actually narrowed anything.
  const isNarrowed = debouncedQuery.length > 0 || filter !== "all";
  const nothingLoaded =
    viewState === "ready" && visibleTransactions.length === 0;

  const showEmptyState =
    viewState === "empty" || (nothingLoaded && !isNarrowed);
  const showSearchEmpty = nothingLoaded && isNarrowed;
  const hasRows = viewState === "ready" && visibleTransactions.length > 0;

  // The card is drawn in three parts so its rows can be virtualised. Keeping them
  // inside one View would mean rendering every transaction the shop has ever
  // recorded, along with the icons in each row, on every keystroke.
  const listHeader = useMemo(
    () => (
      <>
        <TransactionHistoryHeader
          compact={compact}
          filter={filter}
          onFilterChange={setFilter}
          onFilterPress={showFilterHint}
          onNotificationsPress={appNotifications.open}
          onProfilePress={goToSettings}
          onQueryChange={setQuery}
          pageHorizontalPadding={pageHorizontalPadding}
          query={query}
          safeAreaTop={insets.top}
          width={width}
        />

        <View style={{ paddingHorizontal: pageHorizontalPadding }}>
          {viewState === "loading" ? <TransactionSkeleton /> : null}
          {viewState === "error" ? (
            <TransactionStateCard kind="error" onRetry={handleRetry} />
          ) : null}
          {showEmptyState ? <TransactionStateCard kind="empty" /> : null}
          {showSearchEmpty ? <TransactionStateCard kind="searchEmpty" /> : null}

          {hasRows ? (
            <View style={styles.cardTop}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Recent Transactions</Text>
                <Pressable
                  accessibilityLabel={`Sort transactions, ${transactionSortLabels[sort]}`}
                  accessibilityRole="button"
                  onPress={openSort}
                  style={({ pressed }) => [
                    styles.sortButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.sortText}>
                    Sort: {transactionSortLabels[sort]}
                  </Text>
                  <Ionicons
                    color={colors.textSecondary}
                    name="chevron-down"
                    size={18}
                  />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </>
    ),
    [
      compact,
      filter,
      goToSettings,
      handleRetry,
      hasRows,
      insets.top,
      openSort,
      pageHorizontalPadding,
      query,
      showEmptyState,
      showFilterHint,
      showSearchEmpty,
      sort,
      viewState,
      width,
    ],
  );

  const listFooter = useMemo(
    () =>
      hasRows ? (
        <View style={{ paddingHorizontal: pageHorizontalPadding }}>
          <View style={styles.cardBottom}>
            {loadingMore ? (
              <ActivityIndicator color={colors.navy} size="small" />
            ) : null}
          </View>
        </View>
      ) : null,
    [hasRows, loadingMore, pageHorizontalPadding],
  );

  const renderRow = useCallback(
    ({ index, item }: { index: number; item: TransactionHistoryItem }) => (
      <View style={{ paddingHorizontal: pageHorizontalPadding }}>
        <View style={styles.cardBody}>
          <TransactionRow
            isLast={index === visibleTransactions.length - 1 && !hasMore}
            item={item}
            onPress={
              item.kind === "bookingSale" || item.kind === "manualOrderSale"
                ? openTransaction
                : undefined
            }
            unread={!seenTransactions.has(item.id)}
          />
        </View>
      </View>
    ),
    [
      hasMore,
      openTransaction,
      pageHorizontalPadding,
      seenTransactions,
      visibleTransactions.length,
    ],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        data={hasRows ? visibleTransactions : []}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={extractTransactionId}
        ListFooterComponent={listFooter}
        ListHeaderComponent={listHeader}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        renderItem={renderRow}
        refreshControl={
          <RefreshControl
            colors={[colors.navy]}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            tintColor={colors.navy}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      <TransactionSortModal
        onChange={setSort}
        onClose={closeSort}
        value={sort}
        visible={sortVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  // The card split into three, so its rows can live in a virtualised list while the
  // surface still reads as one panel: a top with the rounded corners and title, a
  // repeating body for each row, and a bottom that closes it off.
  cardTop: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  cardBody: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  cardBottom: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 2,
  },
  cardTitle: {
    color: colors.navy,
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 23,
  },
  pressed: { opacity: 0.68 },
  screen: { backgroundColor: colors.background, flex: 1 },
  scrollContent: { paddingBottom: 18 },
  sortButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    justifyContent: "flex-end",
    minHeight: 44,
    maxWidth: "50%",
  },
  sortText: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: 13.5,
    fontWeight: "500",
  },
});
