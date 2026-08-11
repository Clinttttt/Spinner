import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useCallback, useState } from "react";

import { useFocusedBackHandler } from "../../../components/common/useFocusedBackHandler";
import type { RootTabParamList } from "../../../navigation/types";
import { AddTransactionScreen } from "../../transactions/screens/AddTransactionScreen";
import { ReportsScreen } from "./ReportsScreen";

type ReportsFlowScreenProps = BottomTabScreenProps<RootTabParamList, "Reports">;

export function ReportsFlowScreen({ navigation }: ReportsFlowScreenProps) {
  const [view, setView] = useState<"add" | "reports">("reports");

  const handleBack = useCallback(() => {
    if (view === "add") {
      setView("reports");
      return true;
    }

    navigation.navigate("Home");
    return true;
  }, [navigation, view]);

  useFocusedBackHandler(handleBack);

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
