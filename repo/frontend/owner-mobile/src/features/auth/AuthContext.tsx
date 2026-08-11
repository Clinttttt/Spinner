import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type AuthSession,
  type AccountCodeDeliveryResponse,
  type RegistrationResponse,
  type RegisterAccountRequest,
  requestPasswordReset,
  registerAccount,
  resendEmailVerification,
  resetPassword,
  revokeApiSession,
  restoreApiSession,
  setSessionExpiredHandler,
  setSessionUpdatedHandler,
  signIn,
  updateStoredApiSessionIdentity,
  verifyEmail,
} from "../../api/apiClient";
import {
  registerForPushNotificationsAsync,
  releasePushNotificationsAsync,
} from "../notifications/services/pushRegistration";
import { resetOperationsCounts } from "../operations/operationsCountsStore";
import { resetPickupTasks } from "../pickup/services/pickupStore";
import { resetSeenTransactions } from "../transactions/services/seenTransactionsStore";
import { resetTransactions } from "../transactions/services/transactionStore";

interface AuthContextValue {
  loading: boolean;
  session?: AuthSession;
  logIn: (login: string, password: string) => Promise<void>;
  register: (request: RegisterAccountRequest) => Promise<RegistrationResponse>;
  verify: (emailAddress: string, code: string) => Promise<void>;
  resendVerification: (
    emailAddress: string,
  ) => Promise<AccountCodeDeliveryResponse>;
  sendPasswordReset: (login: string) => Promise<AccountCodeDeliveryResponse>;
  completePasswordReset: (
    login: string,
    code: string,
    newPassword: string,
    confirmPassword: string,
  ) => Promise<void>;
  logOut: () => Promise<void>;
  updateAccountIdentity: (profile: {
    emailAddress: string;
    fullName: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession>();

  useEffect(() => {
    let active = true;

    setSessionExpiredHandler(() => {
      if (active) setSession(undefined);
    });
    setSessionUpdatedHandler((updatedSession) => {
      if (active) setSession(updatedSession);
    });

    void restoreApiSession()
      .then((restored) => {
        if (active) setSession(restored);

        // Registered on restore too, not only on sign-in. Reopening the app restores a
        // stored session rather than signing in, so registration never ran again — and a
        // reinstall rotates the device token, which meant the old one was retired as
        // unknown and the new one was never recorded. The shop then received no booking
        // alerts at all, silently, with nothing to indicate why.
        if (restored) void registerForPushNotificationsAsync();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      setSessionExpiredHandler(undefined);
      setSessionUpdatedHandler(undefined);
    };
  }, []);

  const logIn = useCallback(async (login: string, password: string) => {
    const authenticated = await signIn(login, password);
    setSession(authenticated);

    // Registered on every sign-in, not once, because the operating system can rotate the
    // device token at any time and a stale one stops receiving anything silently. Not
    // awaited: the owner should reach the app immediately, and a phone that refuses
    // notifications must not hold up or fail signing in.
    void registerForPushNotificationsAsync();
  }, []);

  const register = useCallback(async (request: RegisterAccountRequest) => {
    return registerAccount(request);
  }, []);

  const verify = useCallback(async (emailAddress: string, code: string) => {
    const authenticated = await verifyEmail(emailAddress, code);
    setSession(authenticated);
    void registerForPushNotificationsAsync();
  }, []);

  const resendVerification = useCallback(
    (emailAddress: string) => resendEmailVerification(emailAddress),
    [],
  );

  const sendPasswordReset = useCallback(
    (login: string) => requestPasswordReset(login),
    [],
  );

  const completePasswordReset = useCallback(
    (
      login: string,
      code: string,
      newPassword: string,
      confirmPassword: string,
    ) => resetPassword(login, code, newPassword, confirmPassword),
    [],
  );

  const logOut = useCallback(async () => {
    try {
      // Released before the session is revoked, because the call needs the token that is
      // about to stop working. Someone handing the counter phone back should not keep
      // being told how busy the shop is.
      await releasePushNotificationsAsync();
      await revokeApiSession();
    } finally {
      // Emptied before the session goes, so the next person to sign in cannot see the
      // last one's shop data. These stores are module-level and survive a sign-out on
      // their own, and they are the snapshot the screens render from, so without this the
      // first frame after signing in shows the previous user's transactions, pickups and
      // badge counts until each screen has refetched. The counter phone is shared, which
      // is the whole reason a device can be reassigned between staff.
      resetOperationsCounts();
      resetTransactions();
      resetSeenTransactions();
      resetPickupTasks();

      setSession(undefined);
    }
  }, []);

  const updateAccountIdentity = useCallback(
    async (profile: { emailAddress: string; fullName: string }) => {
      if (!session) return;

      const updatedSession = await updateStoredApiSessionIdentity(profile);
      if (updatedSession) setSession(updatedSession);
    },
    [session],
  );

  const value = useMemo(
    () => ({
      loading,
      session,
      logIn,
      register,
      verify,
      resendVerification,
      sendPasswordReset,
      completePasswordReset,
      logOut,
      updateAccountIdentity,
    }),
    [
      completePasswordReset,
      loading,
      logIn,
      logOut,
      register,
      resendVerification,
      sendPasswordReset,
      session,
      updateAccountIdentity,
      verify,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
