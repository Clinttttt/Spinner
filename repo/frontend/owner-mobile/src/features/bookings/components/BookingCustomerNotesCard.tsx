import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import {
  bookingDetailsCardStyle,
  bookingDetailsColors,
} from "./bookingDetailsTheme";

interface BookingCustomerNotesCardProps {
  note?: string;
}

export function BookingCustomerNotesCard({
  note,
}: BookingCustomerNotesCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Notes from Customer</Text>
      <View style={styles.noteRow}>
        <View style={styles.iconContainer}>
          <Ionicons
            color={bookingDetailsColors.textPrimary}
            name="chatbubble-ellipses-outline"
            size={19}
          />
        </View>
        <Text style={styles.note}>
          {note ?? "No additional notes from customer."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...bookingDetailsCardStyle,
    padding: 18,
  },
  title: {
    color: bookingDetailsColors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  noteRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: bookingDetailsColors.avatarSurface,
    borderColor: bookingDetailsColors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  note: {
    color: bookingDetailsColors.textSecondary,
    flex: 1,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 19,
  },
});
