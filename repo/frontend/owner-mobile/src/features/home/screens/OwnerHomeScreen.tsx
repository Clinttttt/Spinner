import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActivitySection } from "../../../components/home/ActivitySection";
import { DashboardErrorState } from "../../../components/home/DashboardErrorState";
import { GreetingSection } from "../../../components/home/GreetingSection";
import { HomeDashboardSkeleton } from "../../../components/home/HomeDashboardSkeleton";
import { HomeHeader } from "../../../components/home/HomeHeader";
import { PriorityCard } from "../../../components/home/PriorityCard";
import { SpinlyAssistantCard } from "../../../components/home/SpinlyAssistantCard";
import { useAuth } from "../../auth/AuthContext";
import type { RootTabParamList } from "../../../navigation/types";
import { colors } from "../../../theme/colors";
import { spacing } from "../../../theme/spacing";
import type {
  DashboardViewState,
  HomeDashboardData,
} from "../models/homeDashboard";
import { getHomeDashboard } from "../services/homeDashboardService";

const headerWaves = require("../../../../assets/backgrounds/home-header-waves.webp");

type OwnerHomeScreenProps = BottomTabScreenProps<RootTabParamList, "Home">;

export function OwnerHomeScreen({ navigation }: OwnerHomeScreenProps) {
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [viewState, setViewState] = useState<DashboardViewState>("loading");
  const [dashboard, setDashboard] = useState<HomeDashboardData>();
  const [refreshing, setRefreshing] = useState(false);
  const compact = width <= 360;
  const pageHorizontalPadding = width <= 360 ? 12 : 14;
  const topBackgroundHeight = Math.round(
    Math.min(420, Math.max(400, 410 + (width - 390) * 0.25)),
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
                  onNotificationsPress={() => navigation.navigate("Orders")}
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
                    onReportsPress={() => navigation.navigate("Reports")}
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
                      onActivityPress={() => navigation.navigate("Orders")}
                      onViewAllPress={() => navigation.navigate("Orders")}
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
