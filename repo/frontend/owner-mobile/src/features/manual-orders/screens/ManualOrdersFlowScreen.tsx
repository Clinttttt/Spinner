import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { BackHandler } from "react-native";

import { describeApiError } from "../../../api/apiClient";
import { useDialog } from "../../../components/common/DialogProvider";
import type { RootTabParamList } from "../../../navigation/types";
import type { ManualOrder } from "../models/manualOrder";
import {
  clearManualOrder,
  getManualOrders,
} from "../services/manualOrdersService";
import { CreateManualOrderScreen } from "./CreateManualOrderScreen";
import { ManualOrderDetailsScreen } from "./ManualOrderDetailsScreen";
import { ManualOrdersScreen } from "./ManualOrdersScreen";

type ManualOrdersFlowScreenProps = BottomTabScreenProps<
  RootTabParamList,
  "ManualOrders"
>;

type FlowView =
  { name: "list" } | { name: "create" } | { name: "details"; orderId: string };

export function ManualOrdersFlowScreen({
  navigation,
}: ManualOrdersFlowScreenProps) {
  const dialog = useDialog();
  const [orders, setOrders] = useState<ManualOrder[]>([]);
  const [viewState, setViewState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [view, setView] = useState<FlowView>({ name: "list" });
  const handleOrderUpdated = useCallback((updated: ManualOrder) => {
    setOrders((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (view.name !== "list") {
          setView({ name: "list" });
          return true;
        }
        navigation.navigate("Home");
        return true;
      },
    );

    return () => subscription.remove();
  }, [navigation, view.name]);

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await getManualOrders());
      setViewState("ready");
    } catch {
      setViewState("error");
    }
  }, []);

  // Orders also change from the Bookings and Pickup tabs, so the list refetches
  // whenever this tab regains focus instead of only on first mount.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getManualOrders()
        .then((response) => {
          if (!active) return;
          setOrders(response);
          setViewState("ready");
        })
        .catch(() => {
          if (!active) return;
          setViewState((current) => (current === "ready" ? "ready" : "error"));
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const handleClearOrder = useCallback(
    async (order: ManualOrder) => {
      const accepted = await dialog.confirm({
        bullets: [`${order.orderCode} · ${order.customerName}`],
        confirmLabel: "Clear",
        message:
          "This finished order is removed from the list. Sales, receipts, and history keep the record.",
        title: "Clear this order?",
        tone: "warning",
      });
      if (!accepted) return;

      try {
        await clearManualOrder(order.id);
        setOrders((current) => current.filter((item) => item.id !== order.id));
      } catch (error) {
        await dialog.notify({
          message: describeApiError(error, "Please try again."),
          title: "Unable to clear order",
          tone: "danger",
        });
      }
    },
    [dialog],
  );

  if (view.name === "create") {
    return (
      <CreateManualOrderScreen
        navigation={navigation}
        onCancel={() => setView({ name: "list" })}
        onCreated={(order) => {
          setOrders((current) => [order, ...current]);
          setView({ name: "details", orderId: order.id });
        }}
      />
    );
  }

  if (view.name === "details") {
    const order = orders.find((item) => item.id === view.orderId);
    if (order) {
      return (
        <ManualOrderDetailsScreen
          navigation={navigation}
          onBackPress={() => setView({ name: "list" })}
          order={order}
          onOrderUpdated={handleOrderUpdated}
        />
      );
    }
  }

  return (
    <ManualOrdersScreen
      navigation={navigation}
      onClearOrder={(order) => void handleClearOrder(order)}
      onCreateOrder={() => setView({ name: "create" })}
      onViewOrder={(orderId) => setView({ name: "details", orderId })}
      orders={orders}
      onRetry={() => {
        setViewState("loading");
        void loadOrders();
      }}
      viewState={viewState}
    />
  );
}
