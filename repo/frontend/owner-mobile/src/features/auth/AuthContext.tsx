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
  }, []);

  const register = useCallback(async (request: RegisterAccountRequest) => {
    return registerAccount(request);
  }, []);

  const verify = useCallback(async (emailAddress: string, code: string) => {
    const authenticated = await verifyEmail(emailAddress, code);
    setSession(authenticated);
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
      await revokeApiSession();
    } finally {
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
