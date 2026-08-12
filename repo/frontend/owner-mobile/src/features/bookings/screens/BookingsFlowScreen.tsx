import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useCallback, useState } from "react";

import { useFocusedBackHandler } from "../../../components/common/useFocusedBackHandler";
import type { RootTabParamList } from "../../../navigation/types";
import { BookingDetailsScreen } from "./BookingDetailsScreen";
import { BookingsScreen } from "./BookingsScreen";

type BookingsFlowScreenProps = BottomTabScreenProps<RootTabParamList, "Orders">;

export function BookingsFlowScreen({ navigation }: BookingsFlowScreenProps) {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  );

  const handleBack = useCallback(() => {
    // Only claims the press when a booking is open; otherwise it is passed on so the
    // system can close the app from the list.
    if (!selectedBookingId) return false;

    setSelectedBookingId(null);
    return true;
  }, [selectedBookingId]);

  useFocusedBackHandler(handleBack);

  if (selectedBookingId) {
    return (
      <BookingDetailsScreen
        bookingId={selectedBookingId}
        onBackPress={() => setSelectedBookingId(null)}
        onContactSupport={() =>
          navigation.navigate("Settings", { page: "help" })
        }
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
