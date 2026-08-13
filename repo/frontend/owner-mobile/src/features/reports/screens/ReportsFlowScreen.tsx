import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useCallback, useState } from "react";

import { useFocusedBackHandler } from "../../../components/common/useFocusedBackHandler";
import type { RootTabParamList } from "../../../navigation/types";
import { useAuth } from "../../auth/AuthContext";
import { isOwner } from "../../auth/permissions";
import { AddTransactionScreen } from "../../transactions/screens/AddTransactionScreen";
import { OwnerOnlyScreen } from "./OwnerOnlyScreen";
import { ReportsScreen } from "./ReportsScreen";

type ReportsFlowScreenProps = BottomTabScreenProps<RootTabParamList, "Reports">;

export function ReportsFlowScreen({ navigation }: ReportsFlowScreenProps) {
  const { session } = useAuth();
  const [view, setView] = useState<"add" | "reports">("reports");

  const owner = isOwner(session);

  const handleBack = useCallback(() => {
    if (view === "add") {
      setView("reports");
      return true;
    }

    navigation.navigate("Home");
    return true;
  }, [navigation, view]);

  useFocusedBackHandler(handleBack);

  /**
   * Reports are owner work in the API, so a staff account is told so plainly.
   *
   * The lock on the Insights button is the first line, and this is the second: the tab can
   * still be reached in other ways, and without it a staff account landed on the reports
   * screen's own failure message — "We couldn't load your reports. Check your connection" —
   * which blamed the network for a permission the account was never going to have.
   */
  if (!owner) {
    return <OwnerOnlyScreen onBackPress={() => navigation.navigate("Home")} />;
  }

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
