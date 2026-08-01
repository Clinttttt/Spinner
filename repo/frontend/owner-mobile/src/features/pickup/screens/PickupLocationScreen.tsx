import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  ToastAndroid,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { describeApiError } from "../../../api/apiClient";
import { useDialog } from "../../../components/common/DialogProvider";
import type { RootTabParamList } from "../../../navigation/types";
import { colors } from "../../../theme/colors";
import { PickupCustomerSummaryCard } from "../components/PickupCustomerSummaryCard";
import { PickupLocationDetailsCard } from "../components/PickupLocationDetailsCard";
import { PickupLocationHeader } from "../components/PickupLocationHeader";
import { PickupLocationMap } from "../components/PickupLocationMap";
import {
  buildPickupConfirmationLines,
  confirmationSourceFromDetails,
} from "../services/pickupConfirmation";
import {
  PickupLocationSkeleton,
  PickupLocationState,
} from "../components/PickupLocationStates";
import type { PickupStackParamList } from "../navigation/types";
import type { PickupLocationDetails } from "../models/pickupLocation";
import {
  advancePickupStatus,
  loadPickupLocation,
} from "../services/pickupStore";

type PickupLocationScreenProps = NativeStackScreenProps<
  PickupStackParamList,
  "PickupLocation"
>;

type ScreenState = "loading" | "ready" | "empty" | "error";

export function PickupLocationScreen({
  navigation,
  route,
}: PickupLocationScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const dialog = useDialog();
  const compact = width <= 390;
  const pageHorizontalPadding = compact ? 16 : 14;
  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [details, setDetails] = useState<PickupLocationDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const showToast = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    void dialog.notify({ message, title: "Pickup", tone: "success" });
  };

  useEffect(() => {
    let active = true;
    void loadPickupLocation(route.params.pickupId)
      .then((result) => {
        if (!active) return;
        if (!result) {
          setDetails(null);
          setScreenState("empty");
          return;
        }
        setDetails(result);
        setScreenState("ready");
      })
      .catch(() => {
        if (!active) return;
        setDetails(null);
        setScreenState("error");
      });
    return () => {
      active = false;
    };
  }, [reloadToken, route.params.pickupId]);

  const handleProfile = () => {
    navigation
      .getParent<BottomTabNavigationProp<RootTabParamList>>()
      ?.navigate("Settings");
  };

  const handleCall = async () => {
    if (!details?.customerPhone) return;
    try {
      await Linking.openURL(`tel:${details.customerPhone}`);
    } catch {
      await dialog.notify({
        message: "This device cannot open the phone dialer.",
        title: "Call unavailable",
        tone: "warning",
      });
    }
  };

  const handleCopy = async () => {
    if (!details) return;
    const address = details.location.formattedAddress || details.shortAddress;
    const text = details.location.landmark
      ? `${address}\nLandmark: ${details.location.landmark}`
      : address;
    await Clipboard.setStringAsync(text);
    showToast("Address copied.");
  };

  const handleOpenMaps = async () => {
    if (!details) return;
    const { latitude, longitude } = details.location;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      await dialog.notify({
        message:
          "This customer did not share a map pin. Use the written address or call them for directions.",
        title: "No map pin for this pickup",
        tone: "warning",
      });
      return;
    }

    const label = encodeURIComponent(details.location.formattedAddress);
    const nativeUrl =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?daddr=${latitude},${longitude}&q=${label}`
        : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
    const browserUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

    try {
      await Linking.openURL(nativeUrl);
    } catch {
      try {
        await Linking.openURL(browserUrl);
      } catch {
        await dialog.notify({
          message: "This device cannot open a maps application.",
          title: "Maps unavailable",
          tone: "warning",
        });
      }
    }
  };

  const handlePrimaryAction = async () => {
    if (!details || submitting || details.pickupStatus === "pickedUp") return;

    if (details.awaitingConfirmation) {
      const accepted = await dialog.confirm({
        bullets: buildPickupConfirmationLines(
          confirmationSourceFromDetails(details),
        ),
        confirmLabel: "Confirm Booking",
        message:
          "This customer booking still needs your approval before the pickup can be collected.",
        title: `Confirm ${details.orderCode}?`,
      });
      if (!accepted) return;
    } else if (details.pickupStatus === "onRoute") {
      const accepted = await dialog.confirm({
        bullets: buildPickupConfirmationLines(
          confirmationSourceFromDetails(details),
        ),
        confirmLabel: "Mark Picked Up",
        message:
          "Check this against the bags before you confirm. The customer is notified and the order moves into processing.",
        title: "Mark this pickup collected?",
      });
      if (!accepted) return;
    }

    setSubmitting(true);
    try {
      const next = await advancePickupStatus(details.pickupId);
      if (next) setDetails(next);
      showToast(
        next?.awaitingConfirmation === false && details.awaitingConfirmation
          ? "Booking confirmed."
          : next?.pickupStatus === "onRoute"
            ? "Pickup marked on route."
            : "Pickup marked as picked up.",
      );
    } catch (error) {
      await dialog.notify({
        message: describeApiError(error, "Please try again."),
        title: "Unable to update pickup",
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <PickupLocationHeader
          compact={compact}
          onBackPress={navigation.goBack}
          onNotificationsPress={() =>
            void dialog.notify({
              message: "No new pickup notifications.",
              title: "Notifications",
            })
          }
          onProfilePress={handleProfile}
          pageHorizontalPadding={pageHorizontalPadding}
          safeAreaTop={insets.top}
          width={width}
        />
        <View
          style={[styles.content, { paddingHorizontal: pageHorizontalPadding }]}
        >
          {screenState === "loading" ? <PickupLocationSkeleton /> : null}
          {screenState === "error" ? (
            <PickupLocationState
              kind="error"
              onBack={navigation.goBack}
              onRetry={() => {
                setScreenState("loading");
                setReloadToken((current) => current + 1);
              }}
            />
          ) : null}
          {screenState === "empty" ? (
            <PickupLocationState kind="empty" onBack={navigation.goBack} />
          ) : null}
          {screenState === "ready" && details ? (
            <>
              <PickupCustomerSummaryCard compact={compact} details={details} />
              <PickupLocationMap
                compact={compact}
                details={details}
                onOpenMaps={() => void handleOpenMaps()}
              />
              <PickupLocationDetailsCard
                compact={compact}
                details={details}
                onCall={() => void handleCall()}
                onCopy={() => void handleCopy()}
                onOpenMaps={() => void handleOpenMaps()}
                onPrimaryAction={() => void handlePrimaryAction()}
                submitting={submitting}
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 13, paddingTop: 16 },
  screen: { backgroundColor: colors.background, flex: 1 },
});
