import Ionicons from "@expo/vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BookingsFlowScreen } from "../features/bookings/screens/BookingsFlowScreen";
import { OwnerHomeScreen } from "../features/home/screens/OwnerHomeScreen";
import { ManualOrdersFlowScreen } from "../features/manual-orders/screens/ManualOrdersFlowScreen";
import { PickupFlowScreen } from "../features/pickup/screens/PickupFlowScreen";
import { ReportsFlowScreen } from "../features/reports/screens/ReportsFlowScreen";
import { SettingsFlowScreen } from "../features/settings/screens/SettingsFlowScreen";
import { TransactionHistoryScreen } from "../features/transactions/screens/TransactionHistoryScreen";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import type { RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();

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
  TransactionHistory: { active: "time", inactive: "time-outline" },
  Reports: { active: "receipt", inactive: "receipt-outline" },
  Settings: { active: "settings", inactive: "settings-outline" },
};

const tabLabels: Record<keyof RootTabParamList, string> = {
  Home: "Home",
  ManualOrders: "Orders",
  Orders: "Bookings",
  Schedule: "Pickup",
  TransactionHistory: "History",
  Reports: "Insights",
  Settings: "Settings",
};

export function AppTabs() {
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = insets.bottom;
  const visibleTabBarStyle = [
    styles.tabBar,
    {
      height: 64 + tabBarBottomInset,
      paddingBottom: tabBarBottomInset + 4,
    },
  ];

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        animation: "fade",
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
