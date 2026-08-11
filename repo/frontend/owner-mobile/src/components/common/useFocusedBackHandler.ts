import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { BackHandler } from "react-native";

/**
 * Handles the Android back button, but only while the calling screen is focused.
 *
 * Why the focus part matters. A bottom-tab screen stays mounted after its first visit, so
 * a listener registered in a plain useEffect keeps running for the rest of the session no
 * matter which tab the owner is looking at. Two of the flow screens did that and returned
 * true unconditionally, which meant that after one visit to Insights or Orders the back
 * button was swallowed everywhere and the app could not be closed with it. The other two
 * registered only while a sub-page was open, which was better but still left the listener
 * live after a tab switch, so back would quietly close a booking on a screen the owner
 * was no longer looking at.
 *
 * Returning false from the handler passes the press on, which is what lets the system
 * close the app from the first screen.
 *
 * The handler must be stable — wrap it in useCallback — or the subscription is torn down
 * and rebuilt on every render.
 */
export function useFocusedBackHandler(handler: () => boolean) {
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handler,
      );

      return () => subscription.remove();
    }, [handler]),
  );
}
