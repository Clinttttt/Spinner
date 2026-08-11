import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";

import { describeApiError } from "../../../api/apiClient";
import { useDialog } from "../../../components/common/DialogProvider";
import { useFocusedBackHandler } from "../../../components/common/useFocusedBackHandler";
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

  const handleBack = useCallback(() => {
    if (view.name !== "list") {
      setView({ name: "list" });
      return true;
    }

    navigation.navigate("Home");
    return true;
  }, [navigation, view.name]);

  useFocusedBackHandler(handleBack);

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

          // If the order being viewed has gone — cleared from another tab, or finished
          // and archived — the details view has nothing to render and used to fall
          // through to the list while still believing it was on details. That ejected
          // the owner mid-task and left the back button apparently dead. Corrected here,
          // where the data that invalidates it arrives, rather than during render.
          setView((current) => {
            if (current.name !== "details") return current;
            if (response.some((order) => order.id === current.orderId))
              return current;

            void dialog.notify({
              message:
                "It was completed or cleared somewhere else, so it is no longer in this list.",
              title: "That order has been closed",
            });

            return { name: "list" };
          });
        })
        .catch(() => {
          if (!active) return;
          setViewState((current) => (current === "ready" ? "ready" : "error"));
        });
      return () => {
        active = false;
      };
    }, [dialog]),
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

  // Stable identities so the memoised list is not re-rendered, with every card and its
  // icons, whenever anything in this flow changes.
  const clearOrder = useCallback(
    (order: ManualOrder) => void handleClearOrder(order),
    [handleClearOrder],
  );

  const startCreate = useCallback(() => setView({ name: "create" }), []);

  const viewOrder = useCallback(
    (orderId: string) => setView({ name: "details", orderId }),
    [],
  );

  const retry = useCallback(() => {
    setViewState("loading");
    void loadOrders();
  }, [loadOrders]);

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
      onClearOrder={clearOrder}
      onCreateOrder={startCreate}
      onViewOrder={viewOrder}
      orders={orders}
      onRetry={retry}
      viewState={viewState}
    />
  );
}
