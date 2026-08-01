import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { NavigationBar } from "expo-navigation-bar";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppLoadingScreen } from "./src/components/common/AppLoadingScreen";
import { AppTabs } from "./src/navigation/AppTabs";
import { DialogProvider } from "./src/components/common/DialogProvider";
import { AuthProvider, useAuth } from "./src/features/auth/AuthContext";
import { LoginScreen } from "./src/features/auth/screens/LoginScreen";
import { colors } from "./src/theme/colors";
import { OfflineNotice } from "./src/offline/OfflineNotice";

// Hold the native launch screen until React has painted, otherwise Android shows
// a blank frame between the two. Failures are ignored: a visible splash is far
// better than a crash on startup.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    primary: colors.navy,
    text: colors.textPrimary,
    border: colors.border,
  },
};

/**
 * Keeps the branded loading screen on screen for a moment.
 *
 * Restoring the saved session is usually near-instant, so the loading screen was
 * drawn and torn down within a frame or two: the owner only ever saw the native
 * launch screen and reported the branded one as missing. This runs alongside the
 * session restore, so in practice it adds nothing unless startup was already
 * faster than the eye can follow.
 */
function useBrandMoment(durationMs: number) {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  return elapsed;
}

function AppContent() {
  const { loading, session } = useAuth();
  const brandMomentDone = useBrandMoment(900);

  useEffect(() => {
    // The branded loading screen is now on screen and continues the launch
    // artwork, so the native splash can come down without a visible seam.
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  if (loading || !brandMomentDone) return <AppLoadingScreen />;

  if (!session) return <LoginScreen />;

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="dark" />
      <AppTabs />
      <OfflineNotice />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationBar hidden style="light" />
      <StatusBar style="dark" />
      <DialogProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </DialogProvider>
    </SafeAreaProvider>
  );
}
