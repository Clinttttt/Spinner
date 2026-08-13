import Ionicons from "@expo/vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BookingsFlowScreen } from "../features/bookings/screens/BookingsFlowScreen";
import { OwnerHomeScreen } from "../features/home/screens/OwnerHomeScreen";
import { ManualOrdersFlowScreen } from "../features/manual-orders/screens/ManualOrdersFlowScreen";
import { OrderHistoryScreen } from "../features/order-history/screens/OrderHistoryScreen";
import { PickupFlowScreen } from "../features/pickup/screens/PickupFlowScreen";
import { ReportsFlowScreen } from "../features/reports/screens/ReportsFlowScreen";
import { SettingsFlowScreen } from "../features/settings/screens/SettingsFlowScreen";
import { TransactionHistoryScreen } from "../features/transactions/screens/TransactionHistoryScreen";
import {
  acknowledgeTab,
  type BadgedTab,
  getBadgeCount,
  invalidateOperationsCounts,
  refreshOperationsCounts,
  restoreAcknowledgements,
  useOperationsCounts,
} from "../features/operations/operationsCountsStore";
import { refreshBusinessIdentity } from "../features/settings/services/businessIdentityStore";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import type { RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * How often the tab counts are refreshed while the app is open.
 *
 * A minute is often enough that the numbers feel live during a shift, and rare enough
 * that leaving the app open all day is not a stream of requests. Pulling to refresh on
 * any screen updates them immediately.
 */
const COUNT_REFRESH_MS = 60_000;

/** The tabs that carry a badge, so a focus event can be matched against them. */
const badgedTabs: Record<BadgedTab, true> = {
  Orders: true,
  Schedule: true,
  TransactionHistory: true,
};

const tabIcons: Record<
  keyof RootTabParamList,
  {
    active: keyof typeof Ionicons.glyphMap;
    inactive: keyof typeof Ionicons.glyphMap;
  }
> = {
  Home: { active: "home", inactive: "home-outline" },
  ManualOrders: { active: "receipt", inactive: "receipt-outline" },
  Orders: { active: "calendar", inactive: "calendar-outline" },
  Schedule: { active: "car", inactive: "car-outline" },
  OrderHistory: { active: "albums", inactive: "albums-outline" },
  TransactionHistory: { active: "time", inactive: "time-outline" },
  Reports: { active: "receipt", inactive: "receipt-outline" },
  Settings: { active: "settings", inactive: "settings-outline" },
};

const tabLabels: Record<keyof RootTabParamList, string> = {
  Home: "Home",
  ManualOrders: "Orders",
  Orders: "Bookings",
  Schedule: "Pickup",
  OrderHistory: "Orders",
  TransactionHistory: "History",
  Reports: "Insights",
  Settings: "Settings",
};

/**
 * A small count on a tab icon.
 *
 * Shows what is waiting without the owner opening each tab. Capped at 99 so a busy
 * day cannot widen the icon and push the tab bar out of alignment, and hidden
 * entirely at zero rather than drawn as a "0", which would read as a fault.
 */
function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <View
      // Not announced separately: the tab's own label already carries the count.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.badge, count > 9 && styles.badgeWide]}
    >
      <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

export function AppTabs() {
  const insets = useSafeAreaInsets();
  // Subscribed for the re-render, not the value: the badges read acknowledged counts
  // through the store, and this is what makes the bar redraw when either side changes.
  useOperationsCounts();
  const tabBarBottomInset = insets.bottom;

  // Refreshed here because the tab bar is mounted for the whole session, so the counts
  // stay current no matter which screen the owner is on.
  useEffect(() => {
    // Restored first, so a badge the owner already dealt with does not flash back on
    // every app start.
    // The shop's name and logo, read once for the session. The header shows them on
    // nearly every screen, so it is fetched here rather than per header.
    void refreshBusinessIdentity();

    void restoreAcknowledgements().finally(() => {
      void refreshOperationsCounts().catch(() => undefined);
    });

    const timer = setInterval(
      () => void refreshOperationsCounts().catch(() => undefined),
      COUNT_REFRESH_MS,
    );

    return () => clearInterval(timer);
  }, []);

  // Only counts that mean work is waiting. Bookings are requests to approve, Pickup is
  // laundry still to collect, and History carries the unpaid total because money owed
  // is the one thing in the ledger that still needs acting on.
  //
  // Read through the store so each is the count the owner has not acknowledged yet,
  // rather than the raw outstanding figure, which would never clear by being looked at.
  const badgeCounts: Partial<Record<keyof RootTabParamList, number>> = {
    Orders: getBadgeCount("Orders"),
    Schedule: getBadgeCount("Schedule"),
    TransactionHistory: getBadgeCount("TransactionHistory"),
  };

  const visibleTabBarStyle = [
    styles.tabBar,
    {
      height: 64 + tabBarBottomInset,
      paddingBottom: tabBarBottomInset + 4,
    },
  ];

  return (
    <Tab.Navigator
      screenListeners={{
        // Refreshed on every screen focus, so the badges settle as soon as the owner
        // moves on from whatever they just did. Doing this here rather than after each
        // action keeps the services free of any knowledge of the tab bar, and covers
        // every path that changes an order without having to find them all.
        //
        // Opening a badged tab also acknowledges it, which is what makes the count clear
        // once it has been looked at rather than sitting there until the work is done.
        focus: (event) => {
          invalidateOperationsCounts();

          const name = event.target?.split("-")[0] as BadgedTab | undefined;
          if (name && name in badgedTabs) acknowledgeTab(name);
        },
      }}
      screenOptions={({ route }) => ({
        // No cross-fade between tabs. Every screen draws its own copy of the header —
        // the logo, the bell and the profile photo — so fading one scene out while the
        // next faded in made that shared chrome visibly flicker on every tap of the bar,
        // even though it is identical on both sides. An instant swap leaves it looking
        // fixed in place, which is what it is meant to look like.
        animation: "none",
        headerShown: false,
        sceneStyle: styles.scene,
        tabBarActiveTintColor: colors.navy,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarItemStyle: styles.tabItem,
        tabBarLabel: ({ color, focused }) => (
          <Text
            style={[
              styles.tabLabel,
              { color },
              focused ? styles.activeTabLabel : styles.inactiveTabLabel,
            ]}
          >
            {tabLabels[route.name]}
          </Text>
        ),
        tabBarStyle: visibleTabBarStyle,
        tabBarIcon: ({ color, focused }) => (
          <View style={styles.iconSlot}>
            <View
              style={[styles.activeDot, !focused && styles.activeDotHidden]}
            />
            <Ionicons
              color={color}
              name={
                focused
                  ? tabIcons[route.name].active
                  : tabIcons[route.name].inactive
              }
              size={21}
            />
            <TabBadge count={badgeCounts[route.name] ?? 0} />
          </View>
        ),
      })}
    >
      <Tab.Screen component={OwnerHomeScreen} name="Home" />
      <Tab.Screen
        component={ManualOrdersFlowScreen}
        name="ManualOrders"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: styles.hiddenTabItem,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tab.Screen component={BookingsFlowScreen} name="Orders" />
      <Tab.Screen
        component={PickupFlowScreen}
        name="Schedule"
        options={({ route }) => ({
          tabBarStyle:
            (getFocusedRouteNameFromRoute(route) ?? "PickupList") ===
            "PickupLocation"
              ? { display: "none" }
              : visibleTabBarStyle,
        })}
      />
      <Tab.Screen
        component={TransactionHistoryScreen}
        name="TransactionHistory"
      />
      <Tab.Screen
        component={OrderHistoryScreen}
        name="OrderHistory"
        options={{
          // Reached from Transaction History rather than the tab bar, like Orders and
          // Insights. The bar stays visible so the owner is not stranded here.
          tabBarButton: () => null,
          tabBarItemStyle: styles.hiddenTabItem,
          tabBarStyle: visibleTabBarStyle,
        }}
      />
      <Tab.Screen
        component={ReportsFlowScreen}
        name="Reports"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: styles.hiddenTabItem,
          tabBarStyle: visibleTabBarStyle,
        }}
      />
      <Tab.Screen component={SettingsFlowScreen} name="Settings" />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
    paddingTop: 7,
    shadowColor: "transparent",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "flex-start",
    minWidth: 0,
  },
  hiddenTabItem: {
    display: "none",
  },
  tabLabel: {
    fontSize: typography.tabLabel.fontSize,
    lineHeight: typography.tabLabel.lineHeight,
    marginTop: 2,
    textAlign: "center",
  },
  activeTabLabel: {
    fontWeight: "600",
  },
  inactiveTabLabel: {
    fontWeight: "400",
  },
  badge: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 999,
    justifyContent: "center",
    minWidth: 17,
    paddingHorizontal: 4,
    position: "absolute",
    right: -5,
    top: -2,
    height: 17,
  },
  badgeWide: { minWidth: 22 },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    lineHeight: 13,
  },
  iconSlot: {
    alignItems: "center",
    height: 30,
    justifyContent: "flex-start",
    width: 34,
  },
  activeDot: {
    backgroundColor: colors.navy,
    borderRadius: 999,
    height: 5,
    marginBottom: 3,
    width: 5,
  },
  activeDotHidden: {
    opacity: 0,
  },
});
