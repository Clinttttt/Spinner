import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import type { RootTabParamList } from "../../../navigation/types";
import { colors } from "../../../theme/colors";
import { ManualOrderCard } from "../components/ManualOrderCard";
import { ManualOrdersFilterSheet } from "../components/ManualOrdersFilterSheet";
import { ManualOrdersFilterTabs } from "../components/ManualOrdersFilterTabs";
import { ManualOrdersHeader } from "../components/ManualOrdersHeader";
import {
  ManualOrdersSkeleton,
  ManualOrdersState,
} from "../components/ManualOrdersStates";
import { ManualOrdersSummary } from "../components/ManualOrdersSummary";
import type {
  ManualOrder,
  ManualOrderFilter,
  ManualOrdersViewState,
} from "../models/manualOrder";

interface ManualOrdersScreenProps {
  navigation: BottomTabNavigationProp<RootTabParamList, "ManualOrders">;
  onClearOrder: (order: ManualOrder) => void;
  onCreateOrder: () => void;
  onViewOrder: (id: string) => void;
  orders: ManualOrder[];
  onRetry: () => void;
  viewState: ManualOrdersViewState;
}

const extractOrderId = (item: ManualOrder) => item.id;

export function ManualOrdersScreen({
  navigation,
  onClearOrder,
  onCreateOrder,
  onViewOrder,
  orders,
  onRetry,
  viewState,
}: ManualOrdersScreenProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width <= 360;
  const pagePadding = compact ? 12 : 14;
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<ManualOrderFilter>("all");
  const [filterVisible, setFilterVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 280);
    return () => clearTimeout(timer);
  }, [query]);

  const filteredOrders = useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const filterMatches =
        filter === "all" || order.method === filter || order.status === filter;
      const queryMatches =
        !normalized ||
        [
          order.customerName,
          order.orderCode,
          order.phone,
          order.address ?? "",
        ].some((value) => value.toLowerCase().includes(normalized));
      return filterMatches && queryMatches;
    });
  }, [debouncedQuery, filter, orders]);

  const summary = useMemo(
    () => ({
      active: orders.filter(
        (order) => !["completed", "cancelled"].includes(order.status),
      ).length,
      ready: orders.filter((order) => order.status === "ready").length,
      unpaid: orders.filter((order) => order.paymentStatus === "unpaid").length,
    }),
    [orders],
  );
  const showFloatingCreateButton = viewState === "ready" && orders.length > 0;

  const clearFilters = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setFilter("all");
  }, []);

  // FlatList props kept referentially stable. Passing fresh arrow functions and
  // style arrays here re-rendered every card, and each card's icons with it, on
  // each keystroke of the search box — which is what made the list feel like it
  // was constantly redrawing itself.
  const listContentStyle = useMemo(
    () => [
      styles.listContent,
      { paddingBottom: Math.max(insets.bottom, 14) + 104 },
    ],
    [insets.bottom],
  );

  const cardWrapperStyle = useMemo(
    () => [styles.cardWrapper, { marginHorizontal: pagePadding }],
    [pagePadding],
  );

  const renderOrder = useCallback(
    ({ item }: { item: ManualOrder }) => (
      <View style={cardWrapperStyle}>
        <ManualOrderCard
          onClearPress={onClearOrder}
          order={item}
          onViewPress={onViewOrder}
        />
      </View>
    ),
    [cardWrapperStyle, onClearOrder, onViewOrder],
  );

  const listHeader = (
    <>
      <ManualOrdersHeader
        compact={compact}
        horizontalPadding={pagePadding}
        onBackPress={() => navigation.navigate("Home")}
        onFilterPress={() => {
          Keyboard.dismiss();
          setFilterVisible(true);
        }}
        onNotificationsPress={() => undefined}
        onProfilePress={() => navigation.navigate("Settings")}
        onQueryChange={setQuery}
        query={query}
        safeAreaTop={insets.top}
        width={width}
      />
      <View style={{ paddingHorizontal: pagePadding }}>
        <ManualOrdersFilterTabs onChange={setFilter} value={filter} />
        <View style={styles.summaryGap}>
          <ManualOrdersSummary {...summary} />
        </View>
      </View>
    </>
  );

  const emptyState = (() => {
    if (viewState === "loading") {
      return (
        <View style={{ paddingHorizontal: pagePadding }}>
          <ManualOrdersSkeleton />
        </View>
      );
    }
    if (viewState === "error") {
      return (
        <View style={{ paddingHorizontal: pagePadding }}>
          <ManualOrdersState kind="error" onAction={onRetry} />
        </View>
      );
    }
    return (
      <View style={{ paddingHorizontal: pagePadding }}>
        <ManualOrdersState
          kind={query || filter !== "all" ? "search" : "empty"}
          onAction={query || filter !== "all" ? clearFilters : onCreateOrder}
        />
      </View>
    );
  })();

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={listContentStyle}
        data={viewState === "ready" ? filteredOrders : []}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={extractOrderId}
        ListEmptyComponent={emptyState}
        ListHeaderComponent={listHeader}
        onScrollBeginDrag={Keyboard.dismiss}
        renderItem={renderOrder}
        showsVerticalScrollIndicator={false}
      />
      {showFloatingCreateButton ? (
        <Pressable
          accessibilityLabel="Create a manual order"
          accessibilityRole="button"
          onPress={onCreateOrder}
          style={({ pressed }) => [
            styles.createButton,
            { bottom: Math.max(insets.bottom, 16) },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons color={colors.surface} name="add" size={24} />
          <Text style={styles.createButtonText}>New Order</Text>
        </Pressable>
      ) : null}
      {filterVisible ? (
        <ManualOrdersFilterSheet
          onChange={setFilter}
          onClose={() => setFilterVisible(false)}
          value={filter}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: { marginBottom: 12 },
  createButton: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 18,
    flexDirection: "row",
    gap: 7,
    height: 52,
    justifyContent: "center",
    minWidth: 150,
    paddingHorizontal: 18,
    position: "absolute",
    right: 14,
  },
  createButtonText: { color: colors.surface, fontSize: 15, fontWeight: "700" },
  listContent: { flexGrow: 1 },
  pressed: { opacity: 0.78 },
  screen: { backgroundColor: colors.background, flex: 1 },
  summaryGap: { marginBottom: 16, marginTop: 12 },
});
