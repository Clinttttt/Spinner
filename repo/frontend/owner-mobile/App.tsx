import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { NavigationBar } from "expo-navigation-bar";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
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

function AppContent() {
  const { loading, session } = useAuth();

  useEffect(() => {
    // The loading screen mirrors the launch screen, so handing over is invisible
    // and the native splash can come down as soon as React paints.
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  if (loading) return <AppLoadingScreen />;

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
