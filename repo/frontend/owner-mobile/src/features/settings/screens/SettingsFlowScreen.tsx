import { useEffect, useState } from "react";
import { BackHandler } from "react-native";

import type { SettingsPageId } from "../models/settings";
import { SettingsDetailScreen } from "./SettingsDetailScreen";
import { SettingsScreen } from "./SettingsScreen";

export function SettingsFlowScreen() {
  const [activePage, setActivePage] = useState<SettingsPageId | null>(null);

  useEffect(() => {
    if (!activePage) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setActivePage(null);
        return true;
      },
    );

    return () => subscription.remove();
  }, [activePage]);

  if (activePage) {
    return (
      <SettingsDetailScreen
        onBackPress={() => setActivePage(null)}
        page={activePage}
      />
    );
  }

  return <SettingsScreen onOpenPage={setActivePage} />;
}
