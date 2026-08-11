import { useCallback, useState } from "react";

import { useFocusedBackHandler } from "../../../components/common/useFocusedBackHandler";
import type { SettingsPageId } from "../models/settings";
import { SettingsDetailScreen } from "./SettingsDetailScreen";
import { SettingsScreen } from "./SettingsScreen";

export function SettingsFlowScreen() {
  const [activePage, setActivePage] = useState<SettingsPageId | null>(null);

  const handleBack = useCallback(() => {
    // Only claims the press when a settings page is open; otherwise it is passed on so
    // the system can close the app.
    if (!activePage) return false;

    setActivePage(null);
    return true;
  }, [activePage]);

  useFocusedBackHandler(handleBack);

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
