import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useEffect, useState } from "react";
import { BackHandler } from "react-native";

import type { RootTabParamList } from "../../../navigation/types";
import { BookingDetailsScreen } from "./BookingDetailsScreen";
import { BookingsScreen } from "./BookingsScreen";

type BookingsFlowScreenProps = BottomTabScreenProps<RootTabParamList, "Orders">;

export function BookingsFlowScreen({ navigation }: BookingsFlowScreenProps) {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!selectedBookingId) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setSelectedBookingId(null);
        return true;
      },
    );

    return () => subscription.remove();
  }, [selectedBookingId]);

  if (selectedBookingId) {
    return (
      <BookingDetailsScreen
        bookingId={selectedBookingId}
        onBackPress={() => setSelectedBookingId(null)}
        onProfilePress={() => navigation.navigate("Settings")}
      />
    );
  }

  return (
    <BookingsScreen
      navigation={navigation}
      onViewBooking={setSelectedBookingId}
    />
  );
}
