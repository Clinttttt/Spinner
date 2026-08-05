import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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

  const close = useCallback(() => setVisible(false), []);

  const api = useMemo<NotificationsApi>(
    () => ({ open: () => setVisible(true) }),
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
