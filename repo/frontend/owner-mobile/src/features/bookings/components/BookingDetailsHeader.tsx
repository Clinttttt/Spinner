import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { HeaderAccountActions } from "../../../components/common/HeaderAccountActions";
import { IconButton } from "../../../components/common/IconButton";
import { colors } from "../../../theme/colors";

interface BookingDetailsHeaderProps {
  bookingCode?: string;
  onBackPress: () => void;
  onNotificationsPress: () => void;
  onProfilePress: () => void;
  title?: string;
}

export function BookingDetailsHeader({
  bookingCode,
  onBackPress,
  onNotificationsPress,
  onProfilePress,
  title = "Booking Details",
}: BookingDetailsHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.leftGroup}>
        <IconButton accessibilityLabel="Back to bookings" onPress={onBackPress}>
          <Ionicons color={colors.navy} name="chevron-back" size={28} />
        </IconButton>
        <View style={styles.headingCopy}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {bookingCode ? `Order #${bookingCode}` : "Order unavailable"}
          </Text>
        </View>
      </View>

      <HeaderAccountActions
        onNotificationsPress={onNotificationsPress}
        onProfilePress={onProfilePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
  },
  leftGroup: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0,
  },
  headingCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 25,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    marginTop: 1,
  },
});
