import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useEffect, useState } from "react";
import { BackHandler } from "react-native";

import type { RootTabParamList } from "../../../navigation/types";
import { AddTransactionScreen } from "../../transactions/screens/AddTransactionScreen";
import { ReportsScreen } from "./ReportsScreen";

type ReportsFlowScreenProps = BottomTabScreenProps<RootTabParamList, "Reports">;

export function ReportsFlowScreen({ navigation }: ReportsFlowScreenProps) {
  const [view, setView] = useState<"add" | "reports">("reports");

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (view === "add") {
          setView("reports");
          return true;
        }
        navigation.navigate("Home");
        return true;
      },
    );
    return () => subscription.remove();
  }, [navigation, view]);

  if (view === "add") {
    return (
      <AddTransactionScreen
        onBackPress={() => setView("reports")}
        onViewAllPress={() => navigation.navigate("TransactionHistory")}
      />
    );
  }

  return (
    <ReportsScreen
      onAddTransactionPress={() => setView("add")}
      onProfilePress={() => navigation.navigate("Settings")}
    />
  );
}
