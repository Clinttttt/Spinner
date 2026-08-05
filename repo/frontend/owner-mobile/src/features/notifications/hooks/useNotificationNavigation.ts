import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import type { RootTabParamList } from "../../../navigation/types";
import { invalidateOperationsCounts } from "../../operations/operationsCountsStore";

/**
 * How a notification behaves while the app is already open.
 *
 * Shown rather than swallowed: staff may be on another screen when a booking arrives, and
 * the point of the alert is that it does not depend on someone looking.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Opens the order a notification refers to when it is tapped.
 *
 * Covers both cases: the app already running, and the app launched by the tap. Without
 * the second, tapping a notification from a closed app would land on Home and leave the
 * owner to find the booking themselves, which is the behaviour that made the bell
 * useless before.
 */
export function useNotificationNavigation() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  useEffect(() => {
    let active = true;

    const openFrom = (data: Record<string, unknown> | undefined) => {
      // A booking has arrived or changed, so the tab counts are stale.
      invalidateOperationsCounts();

      const orderCode =
        typeof data?.orderCode === "string" ? data.orderCode : "";

      // With a code the ledger opens on that order with its details showing. Without
      // one — an older notification, or an alert not tied to an order — it opens
      // unfiltered rather than searching for something that cannot match.
      navigation.navigate(
        "OrderHistory",
        orderCode ? { orderCode } : undefined,
      );
    };

    // The app was launched by tapping the notification.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!active || !response) return;
      openFrom(response.notification.request.content.data);
    });

    // The app was already running.
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => openFrom(response.notification.request.content.data),
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, [navigation]);
}
