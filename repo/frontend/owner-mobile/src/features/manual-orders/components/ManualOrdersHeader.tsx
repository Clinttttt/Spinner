import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { HomeHeader } from "../../../components/home/HomeHeader";
import { colors } from "../../../theme/colors";

const headerWaves = require("../../../../assets/backgrounds/home-header-waves.webp");

interface ManualOrdersHeaderProps {
  compact: boolean;
  horizontalPadding: number;
  onBackPress: () => void;
  onFilterPress: () => void;
  onNotificationsPress: () => void;
  onProfilePress: () => void;
  onQueryChange: (value: string) => void;
  query: string;
  safeAreaTop: number;
  width: number;
}

export function ManualOrdersHeader({
  compact,
  horizontalPadding,
  onBackPress,
  onFilterPress,
  onNotificationsPress,
  onProfilePress,
  onQueryChange,
  query,
  safeAreaTop,
  width,
}: ManualOrdersHeaderProps) {
  return (
    <View style={styles.container}>
      <View
        pointerEvents="none"
        style={[
          styles.backgroundFrame,
          { left: -(width + 28), width: width + 440 },
        ]}
      >
        <Image
          fadeDuration={0}
          resizeMode="cover"
          source={headerWaves}
          style={styles.backgroundImage}
        />
      </View>
      <View
        style={{
          paddingHorizontal: horizontalPadding,
          paddingTop: safeAreaTop + 12,
        }}
      >
        <HomeHeader
          onNotificationsPress={onNotificationsPress}
          onProfilePress={onProfilePress}
        />
        <View style={styles.headingRow}>
          <Pressable
            accessibilityLabel="Back to Home"
            accessibilityRole="button"
            onPress={onBackPress}
            style={styles.backButton}
          >
            <Ionicons color={colors.navy} name="chevron-back" size={25} />
          </Pressable>
          <View style={styles.headingCopy}>
            <Text style={[styles.title, compact && styles.compactTitle]}>
              Orders
            </Text>
            <Text style={styles.subtitle}>
              Manage walk-in, drop-off, and owner-created orders.
            </Text>
          </View>
        </View>
        <View style={styles.searchBar}>
          <Ionicons
            color={colors.textSecondary}
            name="search-outline"
            size={22}
          />
          <TextInput
            accessibilityLabel="Search manual orders by name, order ID, phone, or address"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={onQueryChange}
            placeholder="Search by name, order ID, or phone..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={styles.input}
            value={query}
          />
          <Pressable
            accessibilityLabel="Manual order filters"
            accessibilityRole="button"
            onPress={onFilterPress}
            style={styles.filterButton}
          >
            <Ionicons
              color={colors.textSecondary}
              name="options-outline"
              size={22}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  backgroundFrame: { height: 350, position: "absolute", top: -105 },
  backgroundImage: { height: "100%", opacity: 0.92, width: "100%" },
  compactTitle: { fontSize: 27 },
  container: { overflow: "hidden", paddingBottom: 16, position: "relative" },
  filterButton: {
    alignItems: "center",
    borderLeftColor: colors.border,
    borderLeftWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 46,
  },
  headingCopy: { flex: 1, minWidth: 0 },
  headingRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  input: {
    color: colors.navy,
    flex: 1,
    fontSize: 14,
    height: "100%",
    marginLeft: 10,
    paddingVertical: 0,
  },
  searchBar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.97)",
    borderColor: "#E6EAF0",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 52,
    marginTop: 17,
    paddingLeft: 16,
    paddingRight: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 3,
  },
  title: {
    color: colors.navy,
    fontSize: 29,
    fontWeight: "700",
    lineHeight: 35,
  },
});
