import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { NavigationBar } from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppLoadingScreen } from "./src/components/common/AppLoadingScreen";
import { AppTabs } from "./src/navigation/AppTabs";
import { DialogProvider } from "./src/components/common/DialogProvider";
import { AuthProvider, useAuth } from "./src/features/auth/AuthContext";
import { LoginScreen } from "./src/features/auth/screens/LoginScreen";
import { colors } from "./src/theme/colors";
import { OfflineNotice } from "./src/offline/OfflineNotice";

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
