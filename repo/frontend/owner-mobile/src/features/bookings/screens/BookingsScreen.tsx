import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
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
import { BookingCard } from "../components/BookingCard";
import { BookingsEmptyState } from "../components/BookingsEmptyState";
import { BookingsErrorState } from "../components/BookingsErrorState";
import { BookingsFilterModal } from "../components/BookingsFilterModal";
import { BookingsHeader } from "../components/BookingsHeader";
import { BookingsSkeleton } from "../components/BookingsSkeleton";
import { defaultBookingAdvancedFilters } from "../data/bookingFilters";
import type {
  BookingAdvancedFilters,
  BookingListItem,
  BookingStatusFilter,
  BookingsViewState,
} from "../models/booking";
import {
  cancelAndClearBooking,
  clearBooking,
  getBookings,
} from "../services/bookingsService";

interface BookingsScreenProps {
  navigation: BottomTabNavigationProp<RootTabParamList, "Orders">;
  onViewBooking: (bookingId: string) => void;
}

function advancedFiltersAreActive(filters: BookingAdvancedFilters) {
  return Object.values(filters).some((value) => value !== "all");
}

export function BookingsScreen({
  navigation,
  onViewBooking,
}: BookingsScreenProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  const compact = width <= 360;
  const pageHorizontalPadding = compact ? 12 : 14;
  const [viewState, setViewState] = useState<BookingsViewState>("loading");
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>("all");
  const [advancedFilters, setAdvancedFilters] = useState(
    defaultBookingAdvancedFilters,
  );
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const debounceTimer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const loadBookings = useCallback(async () => {
    try {
      const response = await getBookings();
      setBookings(response);
      setViewState("ready");
    } catch {
      setViewState("error");
    }
  }, []);

  // Statuses change from the details screen and from the pickup tab, so the list
  // is refetched whenever it becomes visible again.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getBookings()
        .then((response) => {
          if (!active) return;
          setBookings(response);
          setViewState("ready");
        })
        .catch(() => {
          if (!active) return;
          setViewState((current) => (current === "ready" ? "ready" : "error"));
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const handleClearBooking = useCallback(
    async (booking: BookingListItem) => {
      // A finished booking is simply tidied away. One that is still open has to
      // be cancelled first, which is a different decision and says so.
      const needsCancel = !booking.canClear && booking.canCancel;

      const accepted = await dialog.confirm({
        bullets: [`${booking.bookingCode} · ${booking.customerName}`],
        confirmLabel: needsCancel ? "Cancel & Clear" : "Clear",
        message: needsCancel
          ? "This order is still open and unpaid. Cancelling it stops the job and removes it from the list. Sales, receipts, and history keep the record."
          : "This finished booking is removed from the list. Sales, receipts, and history keep the record.",
        title: needsCancel ? "Cancel this order?" : "Clear this booking?",
        tone: needsCancel ? "danger" : "warning",
      });
      if (!accepted) return;

      try {
        if (needsCancel) await cancelAndClearBooking(booking.id);
        else await clearBooking(booking.id);
        setBookings((current) =>
          current.filter((item) => item.id !== booking.id),
        );
      } catch (error) {
        await dialog.notify({
          message: describeApiError(error, "Please try again."),
          title: needsCancel
            ? "Unable to cancel order"
            : "Unable to clear booking",
          tone: "danger",
        });
      }
    },
    [dialog],
  );

  const hasActiveAdvancedFilters = advancedFiltersAreActive(advancedFilters);
  const isFiltered =
    query.trim().length > 0 ||
    statusFilter !== "all" ||
    hasActiveAdvancedFilters;

  const filteredBookings = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();

    return bookings
      .filter(
        (booking) =>
          statusFilter === "all" || booking.bookingStatus === statusFilter,
      )
      .filter((booking) => {
        if (!normalizedQuery) return true;

        return [
          booking.customerName,
          booking.bookingCode,
          booking.address,
          booking.phoneNumber ?? "",
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .filter(
        (booking) =>
          advancedFilters.service === "all" ||
          booking.serviceTags.includes(advancedFilters.service),
      )
      .filter(
        (booking) =>
          advancedFilters.paymentStatus === "all" ||
          booking.paymentStatus === advancedFilters.paymentStatus,
      )
      .filter(
        (booking) =>
          advancedFilters.fulfillmentType === "all" ||
          booking.fulfillmentType === advancedFilters.fulfillmentType,
      )
      .filter(
        (booking) =>
          advancedFilters.dateBucket === "all" ||
          booking.dateBucket === advancedFilters.dateBucket,
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }, [advancedFilters, bookings, debouncedQuery, statusFilter]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setStatusFilter("all");
    setAdvancedFilters(defaultBookingAdvancedFilters);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadBookings();
    } finally {
      setRefreshing(false);
    }
  }, [loadBookings]);

  const handleRetry = useCallback(() => {
    setViewState("loading");
    void loadBookings();
  }, [loadBookings]);

  const handleApplyFilters = useCallback(
    (
      nextAdvancedFilters: BookingAdvancedFilters,
      nextStatusFilter: BookingStatusFilter,
    ) => {
      setAdvancedFilters(nextAdvancedFilters);
      setStatusFilter(nextStatusFilter);
      setFilterModalVisible(false);
    },
    [],
  );

  const handleViewBooking = useCallback(
    (bookingId: string) => {
      onViewBooking(bookingId);
    },
    [onViewBooking],
  );

  // Stable identities so memo(BookingCard) holds. React Native's cell renderer is
  // not a PureComponent, so an inline arrow here re-rendered every card and every
  // icon inside it whenever the list re-rendered.
  const cardWrapperStyle = useMemo(
    () => [styles.cardWrapper, { marginHorizontal: pageHorizontalPadding }],
    [pageHorizontalPadding],
  );

  const onClearBookingPress = useCallback(
    (booking: BookingListItem) => void handleClearBooking(booking),
    [handleClearBooking],
  );

  const renderBooking = useCallback(
    ({ item }: { item: BookingListItem }) => (
      <View style={cardWrapperStyle}>
        <BookingCard
          booking={item}
          compact={compact}
          onClearPress={onClearBookingPress}
          onViewPress={handleViewBooking}
        />
      </View>
    ),
    [cardWrapperStyle, compact, onClearBookingPress, handleViewBooking],
  );

  const listHeader = useMemo(
    () => (
      <BookingsHeader
        compact={compact}
        hasActiveFilters={hasActiveAdvancedFilters}
        onFilterPress={() => {
          Keyboard.dismiss();
          setFilterModalVisible(true);
        }}
        onNotificationsPress={appNotifications.open}
        onProfilePress={() => navigation.navigate("Settings")}
        onQueryChange={setQuery}
        onStatusChange={setStatusFilter}
        pageHorizontalPadding={pageHorizontalPadding}
        query={query}
        safeAreaTop={insets.top}
        statusFilter={statusFilter}
        width={width}
      />
    ),
    [
      compact,
      hasActiveAdvancedFilters,
      insets.top,
      navigation,
      pageHorizontalPadding,
      query,
      statusFilter,
      width,
    ],
  );

  const listEmpty = useMemo(() => {
    if (viewState === "loading") {
      return (
        <View style={{ marginHorizontal: pageHorizontalPadding }}>
          <BookingsSkeleton />
        </View>
      );
    }

    if (viewState === "error") {
      return (
        <View style={{ marginHorizontal: pageHorizontalPadding }}>
          <BookingsErrorState onRetry={handleRetry} />
        </View>
      );
    }

    return (
      <View style={{ marginHorizontal: pageHorizontalPadding }}>
        <BookingsEmptyState
          filtered={isFiltered}
          onClearFilters={clearFilters}
        />
      </View>
    );
  }, [clearFilters, handleRetry, isFiltered, pageHorizontalPadding, viewState]);

  return (
    <View style={styles.screen}>
      <FlatList
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="never"
        data={viewState === "ready" ? filteredBookings : []}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
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
        renderItem={renderBooking}
        showsVerticalScrollIndicator={false}
      />

      {filterModalVisible ? (
        <BookingsFilterModal
          advancedFilters={advancedFilters}
          onApply={handleApplyFilters}
          onClose={() => setFilterModalVisible(false)}
          statusFilter={statusFilter}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 16,
  },
});
