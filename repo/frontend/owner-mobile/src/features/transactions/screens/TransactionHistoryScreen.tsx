import Ionicons from "@expo/vector-icons/Ionicons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appDialog } from "../../../components/common/DialogProvider";
import type { RootTabParamList } from "../../../navigation/types";
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
  refreshTransactions,
  useTransactions,
} from "../services/transactionStore";

type TransactionHistoryScreenProps = BottomTabScreenProps<
  RootTabParamList,
  "TransactionHistory"
>;

function startOfWeek(value: Date) {
  const start = new Date(value);
  const day = start.getDay();
  const distanceToMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - distanceToMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

function matchesFilter(
  item: TransactionHistoryItem,
  filter: TransactionFilter,
) {
  const occurredAt = new Date(item.occurredAt);
  const now = new Date();

  if (filter === "income") return item.kind !== "manualDeduction";
  if (filter === "deduction") return item.kind === "manualDeduction";
  if (filter === "today")
    return occurredAt.toDateString() === now.toDateString();
  if (filter === "thisWeek") return occurredAt >= startOfWeek(now);
  return true;
}

function matchesQuery(item: TransactionHistoryItem, query: string) {
  if (!query) return true;
  const searchable = [
    item.title,
    item.kind,
    item.note,
    item.orderCode,
    item.serviceLabel,
    item.amount.toString(),
    item.amount.toFixed(2),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return searchable.includes(query);
}

function sortTransactions(
  items: TransactionHistoryItem[],
  sort: TransactionSort,
) {
  return [...items].sort((left, right) => {
    if (sort === "highest") return right.amount - left.amount;
    if (sort === "lowest") return left.amount - right.amount;
    const difference =
      new Date(right.occurredAt).getTime() -
      new Date(left.occurredAt).getTime();
    return sort === "oldest" ? -difference : difference;
  });
}

export function TransactionHistoryScreen({
  navigation,
}: TransactionHistoryScreenProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const transactions = useTransactions();
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

  useEffect(() => {
    let active = true;
    refreshTransactions()
      .then(() => active && setViewState("ready"))
      .catch(() => active && setViewState("error"));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedQuery(query.trim().toLowerCase()),
      300,
    );
    return () => clearTimeout(timeout);
  }, [query]);

  const visibleTransactions = useMemo(
    () =>
      sortTransactions(
        transactions.filter(
          (item) =>
            matchesFilter(item, filter) && matchesQuery(item, debouncedQuery),
        ),
        sort,
      ),
    [debouncedQuery, filter, sort, transactions],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshTransactions();
      setViewState("ready");
    } catch {
      setViewState("error");
    } finally {
      setRefreshing(false);
    }
  };

  const openTransaction = (item: TransactionHistoryItem) => {
    if (item.kind === "bookingSale") navigation.navigate("Orders");
    if (item.kind === "manualOrderSale") navigation.navigate("ManualOrders");
  };

  const showEmptyState =
    viewState === "empty" ||
    (viewState === "ready" && transactions.length === 0);
  const showSearchEmpty =
    viewState === "ready" &&
    transactions.length > 0 &&
    visibleTransactions.length === 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          <RefreshControl
            colors={[colors.navy]}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            tintColor={colors.navy}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <TransactionHistoryHeader
          compact={compact}
          filter={filter}
          onFilterChange={setFilter}
          onFilterPress={() =>
            void appDialog.notify({
              message: "Use the quick filters below the search field.",
              title: "Transaction filters",
            })
          }
          onNotificationsPress={() => navigation.navigate("Orders")}
          onProfilePress={() => navigation.navigate("Settings")}
          onQueryChange={setQuery}
          pageHorizontalPadding={pageHorizontalPadding}
          query={query}
          safeAreaTop={insets.top}
          width={width}
        />

        <View style={{ paddingHorizontal: pageHorizontalPadding }}>
          {viewState === "loading" ? <TransactionSkeleton /> : null}
          {viewState === "error" ? (
            <TransactionStateCard
              kind="error"
              onRetry={() => {
                setViewState("loading");
                void refreshTransactions()
                  .then(() => setViewState("ready"))
                  .catch(() => setViewState("error"));
              }}
            />
          ) : null}
          {showEmptyState ? <TransactionStateCard kind="empty" /> : null}
          {showSearchEmpty ? <TransactionStateCard kind="searchEmpty" /> : null}

          {viewState === "ready" && visibleTransactions.length > 0 ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Recent Transactions</Text>
                <Pressable
                  accessibilityLabel={`Sort transactions, ${transactionSortLabels[sort]}`}
                  accessibilityRole="button"
                  onPress={() => setSortVisible(true)}
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
              {visibleTransactions.map((item, index) => (
                <TransactionRow
                  isLast={index === visibleTransactions.length - 1}
                  item={item}
                  key={item.id}
                  onPress={
                    item.kind === "bookingSale" ||
                    item.kind === "manualOrderSale"
                      ? () => openTransaction(item)
                      : undefined
                  }
                />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
      <TransactionSortModal
        onChange={setSort}
        onClose={() => setSortVisible(false)}
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
