import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appDialog } from "../../../components/common/DialogProvider";
import { ActivitySection } from "../../../components/home/ActivitySection";
import { DashboardErrorState } from "../../../components/home/DashboardErrorState";
import { GreetingSection } from "../../../components/home/GreetingSection";
import { HomeDashboardSkeleton } from "../../../components/home/HomeDashboardSkeleton";
import { HomeHeader } from "../../../components/home/HomeHeader";
import { PriorityCard } from "../../../components/home/PriorityCard";
import { SpinlyAssistantCard } from "../../../components/home/SpinlyAssistantCard";
import { useAuth } from "../../auth/AuthContext";
import { isOwner, ownerOnlyNotice } from "../../auth/permissions";
import type { RootTabParamList } from "../../../navigation/types";
import { appNotifications } from "../../notifications/components/NotificationsProvider";
import { useOperationsCounts } from "../../operations/operationsCountsStore";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import type {
  DashboardViewState,
  HomeActivity,
  HomeDashboardData,
} from "../models/homeDashboard";
import { getHomeDashboard } from "../services/homeDashboardService";
import { buildSpinlySummary } from "../services/spinlySummary";

const headerWaves = require("../../../../assets/backgrounds/home-header-waves.webp");

type OwnerHomeScreenProps = BottomTabScreenProps<RootTabParamList, "Home">;

export function OwnerHomeScreen({ navigation }: OwnerHomeScreenProps) {
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [viewState, setViewState] = useState<DashboardViewState>("loading");
  const [dashboard, setDashboard] = useState<HomeDashboardData>();
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Whether this account may read the shop's takings.
   *
   * Reports are owner work in the API, so a staff account opening Insights used to get the
   * screen's own failure message — "We couldn't load your reports. Check your connection" —
   * for something that was never a connection problem and never would have worked.
   */
  const owner = isOwner(session);

  const openInsights = useCallback(() => {
    if (!owner) {
      void appDialog.notify({
        message: ownerOnlyNotice.message,
        title: ownerOnlyNotice.title,
        tone: "info",
      });
      return;
    }

    navigation.navigate("Reports");
  }, [navigation, owner]);
  const compact = width <= 360;
  const pageHorizontalPadding = width <= 360 ? 12 : 14;
  const topBackgroundHeight = Math.round(
    Math.min(420, Math.max(400, 410 + (width - 390) * 0.25)),
  );

  // Read from the shared store rather than fetched again: getHomeDashboard already
  // refreshes it, so the assistant card, the tab badges and this screen all describe the
  // same figures without a second request.
  const counts = useOperationsCounts();

  // Rebuilt when the counts change, which is on load, on focus and on pull to refresh. The
  // clock is read at the same moment, so the wording moves from morning to evening on the
  // next refresh rather than needing a timer.
  const spinlySummary = useMemo(
    () => buildSpinlySummary(counts, new Date()),
    [counts],
  );

  // Confirming or completing an order on another tab changes these counters.
  // Without a focus refetch the priority card kept claiming a booking still
  // needed confirmation after it had already been confirmed.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getHomeDashboard()
        .then((response) => {
          if (!active) return;
          setDashboard(response);
          setViewState("ready");
        })
        .catch(() => {
          if (!active) return;
          // Keep the last good data on screen if a refresh fails.
          setViewState((current) => (current === "ready" ? "ready" : "error"));
        });
      return () => {
        active = false;
      };
    }, []),
  );

  // Recent activity used to send every tap to the Bookings tab, which lists current
  // work — so a finished job, which is most of what appears here, was nowhere to be
  // found. Both now open the order in the history ledger.
  const openActivity = useCallback(
    (activity: HomeActivity) => {
      navigation.navigate(
        "OrderHistory",
        activity.orderCode ? { orderCode: activity.orderCode } : undefined,
      );
    },
    [navigation],
  );

  const openOrderHistory = useCallback(
    () => navigation.navigate("OrderHistory"),
    [navigation],
  );

  const handleRetry = async () => {
    setViewState("loading");
    try {
      setDashboard(await getHomeDashboard());
      setViewState("ready");
    } catch {
      setViewState("error");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      setDashboard(await getHomeDashboard());
      setViewState("ready");
    } catch {
      // The existing snapshot stays visible; the offline banner explains why.
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          <RefreshControl
            colors={[colors.navy]}
            onRefresh={() => void handleRefresh()}
            refreshing={refreshing}
            tintColor={colors.navy}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {viewState === "loading" ? (
          <View
            style={[
              styles.loadingContent,
              {
                paddingHorizontal: pageHorizontalPadding,
                paddingTop: insets.top + spacing.sm,
              },
            ]}
          >
            <HomeDashboardSkeleton />
          </View>
        ) : (
          <>
            <View style={styles.topVisualSection}>
              <View
                pointerEvents="none"
                style={[
                  styles.headerBackgroundFrame,
                  {
                    height: topBackgroundHeight,
                    left: -(width + 28),
                    width: width + 440,
                  },
                ]}
              >
                <Image
                  fadeDuration={0}
                  resizeMode="cover"
                  source={headerWaves}
                  style={styles.headerBackgroundImage}
                />
              </View>
              <View pointerEvents="none" style={styles.largeBubble}>
                <View style={styles.bubbleHighlight} />
              </View>
              <View pointerEvents="none" style={styles.smallBubble} />

              <View
                style={[
                  styles.topVisualContent,
                  {
                    paddingHorizontal: pageHorizontalPadding,
                    paddingTop: insets.top + spacing.sm,
                  },
                ]}
              >
                <HomeHeader
                  onNotificationsPress={appNotifications.open}
                  onProfilePress={() => navigation.navigate("Settings")}
                />
                <View style={styles.greeting}>
                  <GreetingSection
                    compact={compact}
                    ownerName={
                      session?.fullName.trim().split(/\s+/)[0] ||
                      dashboard?.ownerName ||
                      "Owner"
                    }
                  />
                </View>
              </View>
            </View>

            {viewState === "error" ? (
              <View style={{ marginHorizontal: pageHorizontalPadding }}>
                <DashboardErrorState onRetry={handleRetry} />
              </View>
            ) : (
              <>
                <View
                  style={[
                    styles.assistantOverlap,
                    { marginHorizontal: pageHorizontalPadding },
                  ]}
                >
                  <SpinlyAssistantCard
                    onOrdersPress={() => navigation.navigate("ManualOrders")}
                    insightsLocked={!owner}
                    onReportsPress={openInsights}
                    summary={spinlySummary}
                  />
                </View>

                <View
                  style={[
                    styles.mainContent,
                    { paddingHorizontal: pageHorizontalPadding },
                  ]}
                >
                  <View style={styles.priorityGap}>
                    <PriorityCard
                      onPress={() => navigation.navigate("Orders")}
                      pendingBookingCount={dashboard?.pendingBookingCount ?? 0}
                    />
                  </View>
                  <View style={styles.activityGap}>
                    <ActivitySection
                      activities={dashboard?.recentActivities ?? []}
                      onActivityPress={openActivity}
                      onViewAllPress={openOrderHistory}
                    />
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  loadingContent: {
    width: "100%",
  },
  topVisualSection: {
    position: "relative",
  },
  headerBackgroundFrame: {
    position: "absolute",
    top: -105,
  },
  headerBackgroundImage: {
    height: "100%",
    opacity: 0.92,
    width: "100%",
  },
  largeBubble: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(210,216,225,0.38)",
    borderRadius: 68,
    borderWidth: StyleSheet.hairlineWidth,
    height: 136,
    position: "absolute",
    right: -26,
    top: 112,
    width: 136,
  },
  bubbleHighlight: {
    backgroundColor: "rgba(255,255,255,0.32)",
    borderRadius: 10,
    height: 20,
    position: "absolute",
    right: 24,
    top: 18,
    width: 20,
  },
  smallBubble: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(210,216,225,0.32)",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    position: "absolute",
    right: 88,
    top: 148,
    width: 44,
  },
  topVisualContent: {
    paddingBottom: 36,
  },
  greeting: {
    marginTop: 25,
  },
  assistantOverlap: {
    marginTop: -22,
    position: "relative",
    zIndex: 1,
  },
  mainContent: {
    width: "100%",
  },
  priorityGap: {
    marginTop: 18,
  },
  activityGap: {
    marginTop: spacing.xl,
  },
});
