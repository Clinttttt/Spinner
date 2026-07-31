import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { AppDialog, type DialogTone } from "./AppDialog";

export interface ConfirmDialogOptions {
  bullets?: string[];
  cancelLabel?: string;
  confirmLabel?: string;
  message: string;
  title: string;
  tone?: DialogTone;
}

export interface NoticeDialogOptions {
  bullets?: string[];
  confirmLabel?: string;
  message: string;
  title: string;
  tone?: DialogTone;
}

interface DialogRequest {
  bullets?: string[];
  cancelLabel?: string;
  confirmLabel: string;
  message: string;
  title: string;
  tone: DialogTone;
}

interface DialogApi {
  /** Resolves true when the destructive/primary action is accepted. */
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  /** Shows a single-action notice and resolves when it is dismissed. */
  notify: (options: NoticeDialogOptions) => Promise<void>;
}

const DialogContext = createContext<DialogApi | undefined>(undefined);

/**
 * Imperative access for module-level helpers that cannot call hooks.
 * Components should prefer {@link useDialog}.
 */
let activeDialogApi: DialogApi | undefined;

export const appDialog: DialogApi = {
  confirm: (options) =>
    activeDialogApi ? activeDialogApi.confirm(options) : Promise.resolve(false),
  notify: (options) =>
    activeDialogApi ? activeDialogApi.notify(options) : Promise.resolve(),
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const resolverRef = useRef<((accepted: boolean) => void) | null>(null);

  const settle = useCallback((accepted: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    resolve?.(accepted);
  }, []);

  const present = useCallback(
    (next: DialogRequest) =>
      new Promise<boolean>((resolve) => {
        // A second request replaces the first rather than stacking sheets.
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setRequest(next);
      }),
    [],
  );

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (options) =>
        present({
          bullets: options.bullets,
          cancelLabel: options.cancelLabel ?? "Cancel",
          confirmLabel: options.confirmLabel ?? "Continue",
          message: options.message,
          title: options.title,
          tone: options.tone ?? "info",
        }),
      notify: async (options) => {
        await present({
          bullets: options.bullets,
          confirmLabel: options.confirmLabel ?? "Got it",
          message: options.message,
          title: options.title,
          tone: options.tone ?? "info",
        });
      },
    }),
    [present],
  );

  useEffect(() => {
    activeDialogApi = api;
    return () => {
      if (activeDialogApi === api) activeDialogApi = undefined;
    };
  }, [api]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      {request ? (
        <AppDialog
          bullets={request.bullets}
          cancelLabel={request.cancelLabel}
          confirmLabel={request.confirmLabel}
          message={request.message}
          onCancel={request.cancelLabel ? () => settle(false) : undefined}
          onConfirm={() => settle(true)}
          title={request.title}
          tone={request.tone}
        />
      ) : null}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used inside a DialogProvider.");
  }
  return context;
}
