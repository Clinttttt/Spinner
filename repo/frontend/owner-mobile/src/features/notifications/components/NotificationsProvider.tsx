import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { acknowledgeNotifications } from "../../operations/operationsCountsStore";
import { useNotificationNavigation } from "../hooks/useNotificationNavigation";
import { NotificationsSheet } from "./NotificationsSheet";

interface NotificationsApi {
  /** Opens the list of messages the shop has sent. */
  open: () => void;
}

/**
 * Imperative access for headers that only receive a callback prop.
 *
 * Follows the same shape as appDialog: the bell appears on nearly every header, and
 * threading a handler down through each one would mean touching every screen to add a
 * behaviour none of them own.
 */
let activeApi: NotificationsApi | undefined;

export const appNotifications: NotificationsApi = {
  open: () => activeApi?.open(),
};

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  // Sits here because this provider is already mounted inside the navigator, which is
  // what a tap needs in order to navigate.
  useNotificationNavigation();

  const close = useCallback(() => setVisible(false), []);

  const api = useMemo<NotificationsApi>(
    () => ({
      open: () => {
        // Opening the log is what marks it as seen, which is what clears the header
        // bell's dot. Done here rather than in the sheet so every route into it counts,
        // including a tap on a push notification.
        acknowledgeNotifications();
        setVisible(true);
      },
    }),
    [],
  );

  // Registered in an effect rather than during render, matching DialogProvider: a
  // module-level assignment while rendering is a side effect, and the cleanup keeps a
  // torn-down provider from leaving a stale handle behind.
  useEffect(() => {
    activeApi = api;
    return () => {
      if (activeApi === api) activeApi = undefined;
    };
  }, [api]);

  return (
    <>
      {children}
      <NotificationsSheet onClose={close} visible={visible} />
    </>
  );
}
