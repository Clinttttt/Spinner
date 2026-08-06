import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appDialog } from "../../../components/common/DialogProvider";
import { colors } from "../../../theme/colors";
import { ReportPeriodControls } from "../components/ReportPeriodControls";
import { ReportPeriodModal } from "../components/ReportPeriodModal";
import { ReportsFilterModal } from "../components/ReportsFilterModal";
import { ReportsHeaderArea } from "../components/ReportsHeaderArea";
import { ReportsOverviewGrid } from "../components/ReportsOverviewGrid";
import { ReportsSkeleton } from "../components/ReportsSkeleton";
import { ReportsStateCard } from "../components/ReportsStateCard";
import { RevenueOverviewCard } from "../components/RevenueOverviewCard";
import { TopServicesCard } from "../components/TopServicesCard";
import { defaultReportFilters } from "../data/reportsConfig";
import type {
  ReportFilters,
  ReportPeriodId,
  ReportsDashboardData,
  ReportsViewState,
} from "../models/reports";
import { getReportsDashboard } from "../services/reportsService";

interface ReportsScreenProps {
  onAddTransactionPress: () => void;
  onProfilePress: () => void;
}

function filtersAreActive(filters: ReportFilters) {
  return Object.values(filters).some((value) => value !== "all");
}

export function ReportsScreen({
  onAddTransactionPress,
  onProfilePress,
}: ReportsScreenProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width <= 360;
  const pageHorizontalPadding = compact ? 12 : 14;
  const availableWidth = width - pageHorizontalPadding * 2;
  const [filters, setFilters] = useState(defaultReportFilters);
  const [filterVisible, setFilterVisible] = useState(false);
  const [periodId, setPeriodId] = useState<ReportPeriodId>("currentWeek");
  const [periodVisible, setPeriodVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewState, setViewState] = useState<ReportsViewState>("loading");
  const [data, setData] = useState<ReportsDashboardData>();

  // Reloaded whenever Insights is opened, not only on first mount. Every other tab
  // refetches on focus; this one did not, so revenue could be from whenever the screen
  // was last visited — and figures that are quietly out of date are worse than none,
  // because there is nothing to suggest they need refreshing.
  //
  // useFocusEffect rather than useEffect covers both cases with one mechanism: it runs on
  // focus, and again if the period or filters change while the screen is open. The view
  // state is deliberately left alone, so a refresh does not flash a skeleton over figures
  // the owner is already reading.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      getReportsDashboard(periodId, filters)
        .then((response) => {
          if (!active) return;
          setData(response);
          setViewState("ready");
        })
        .catch(() => active && setViewState("error"));

      return () => {
        active = false;
      };
    }, [filters, periodId]),
  );

  const loadReport = useCallback(async () => {
    try {
      setData(await getReportsDashboard(periodId, filters));
      setViewState("ready");
    } catch {
      setViewState("error");
    }
  }, [filters, periodId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadReport();
    } finally {
      setRefreshing(false);
    }
  }, [loadReport]);

  const handleRetry = useCallback(() => {
    setViewState("loading");
    void loadReport();
  }, [loadReport]);

  const resetFilters = useCallback(() => {
    setFilters(defaultReportFilters);
    setPeriodId("currentWeek");
    setViewState("loading");
  }, []);

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
        <ReportsHeaderArea
          compact={compact}
          onAddTransactionPress={onAddTransactionPress}
          onProfilePress={onProfilePress}
          pageHorizontalPadding={pageHorizontalPadding}
          safeAreaTop={insets.top}
          width={width}
        />

        <View
          style={[styles.body, { paddingHorizontal: pageHorizontalPadding }]}
        >
          {viewState === "loading" ? <ReportsSkeleton /> : null}
          {viewState === "error" ? (
            <ReportsStateCard kind="error" onAction={handleRetry} />
          ) : null}
          {viewState === "empty" ? (
            <ReportsStateCard kind="empty" onAction={resetFilters} />
          ) : null}
          {viewState === "ready" && data ? (
            <>
              <ReportPeriodControls
                filtersActive={filtersAreActive(filters)}
                onFilterPress={() => setFilterVisible(true)}
                onPeriodPress={() => setPeriodVisible(true)}
                periodLabel={data.periodLabel}
              />
              <ReportsOverviewGrid
                availableWidth={availableWidth}
                comparisonLabel={data.comparisonLabel}
                metrics={data.metrics}
              />
              <RevenueOverviewCard
                compact={compact}
                comparisonLabel={data.comparisonLabel}
                onIntervalPress={() =>
                  void appDialog.notify({
                    message: "Daily reporting is selected for this period.",
                    title: "Revenue interval",
                  })
                }
                points={data.revenuePoints}
                total={data.revenueTotal}
                trendPercent={data.revenueTrendPercent}
              />
              <TopServicesCard
                compact={compact}
                onSortPress={() =>
                  void appDialog.notify({
                    message:
                      "Services are ranked by paid revenue for the selected period.",
                    title: "Top Services",
                  })
                }
                services={data.topServices}
              />
            </>
          ) : null}
        </View>
      </ScrollView>

      {periodVisible ? (
        <ReportPeriodModal
          onChange={(value) => {
            setViewState("loading");
            setPeriodId(value);
          }}
          onClose={() => setPeriodVisible(false)}
          value={periodId}
        />
      ) : null}
      {filterVisible ? (
        <ReportsFilterModal
          filters={filters}
          onApply={(value) => {
            setViewState("loading");
            setFilters(value);
          }}
          onClose={() => setFilterVisible(false)}
          services={data?.topServices ?? []}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 15, paddingTop: 12 },
  scrollContent: { paddingBottom: 16 },
  screen: { backgroundColor: colors.background, flex: 1 },
});
