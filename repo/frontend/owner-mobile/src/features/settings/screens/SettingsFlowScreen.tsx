import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useCallback, useRef, useState } from "react";

import { useFocusedBackHandler } from "../../../components/common/useFocusedBackHandler";
import type { RootTabParamList } from "../../../navigation/types";
import type { SettingsPageId } from "../models/settings";
import { SettingsDetailScreen } from "./SettingsDetailScreen";
import { SettingsScreen } from "./SettingsScreen";

type SettingsFlowScreenProps = BottomTabScreenProps<
  RootTabParamList,
  "Settings"
>;

export function SettingsFlowScreen({ route }: SettingsFlowScreenProps) {
  const [activePage, setActivePage] = useState<SettingsPageId | null>(null);
  const [lastRequest, setLastRequest] = useState<SettingsPageId | null>(null);

  /**
   * Where the settings list was scrolled to.
   *
   * Two pieces, deliberately. The ref accumulates the position as the owner scrolls, which
   * must not redraw anything. The state is a snapshot taken at the moment a page is opened,
   * because a ref cannot be read while rendering and the list needs the value as a prop.
   */
  const listOffset = useRef(0);
  const [offsetOnOpen, setOffsetOnOpen] = useState(0);

  const openPage = useCallback((page: SettingsPageId) => {
    setOffsetOnOpen(listOffset.current);
    setActivePage(page);
  }, []);

  const requestedPage = route.params?.page ?? null;

  /**
   * Opens a page another screen asked for, such as "Contact support" on an order.
   *
   * Applied during render rather than from an effect, which is React's own answer to
   * responding to a changed input and avoids the cascading render that setting state inside
   * an effect causes. It cannot be left to the useState initialiser either: this is a
   * bottom-tab screen and stays mounted once visited, so that runs only once.
   *
   * lastRequest keeps it idempotent, so the owner can navigate back out of the page without
   * it reopening on the next render.
   */
  if (requestedPage && requestedPage !== lastRequest) {
    setLastRequest(requestedPage);
    setActivePage(requestedPage);
  }

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

  return (
    <SettingsScreen
      initialScrollOffset={offsetOnOpen}
      onOpenPage={openPage}
      onScrollOffsetChange={(offset) => {
        listOffset.current = offset;
      }}
    />
  );
}
