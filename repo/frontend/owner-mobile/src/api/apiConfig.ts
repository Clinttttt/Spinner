import { NativeModules, Platform } from "react-native";

const DEFAULT_API_PORT = 5235;
// The shop's own hostname rather than the generated Azure one. Only a fallback: the
// build profile supplies EXPO_PUBLIC_API_BASE_URL, and this is what a build without it
// would use. Kept correct so a misconfigured build fails toward the right place.
const PRODUCTION_API_BASE_URL = "https://api.spinlaundry.online";

function metroHost(): string | undefined {
  const scriptUrl = NativeModules.SourceCode?.scriptURL as string | undefined;
  if (!scriptUrl) return undefined;

  try {
    return new URL(scriptUrl).hostname;
  } catch {
    return undefined;
  }
}

function inferredBaseUrl() {
  if (!__DEV__) return PRODUCTION_API_BASE_URL;

  const host = metroHost();
  if (host) return `http://${host}:${DEFAULT_API_PORT}`;
  if (Platform.OS === "android") return `http://10.0.2.2:${DEFAULT_API_PORT}`;
  return `http://localhost:${DEFAULT_API_PORT}`;
}

function configuredBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(
    /\/$/,
    "",
  );
  if (!configuredUrl) return undefined;

  // A standalone build must never inherit an emulator/LAN address from a
  // developer's local dotenv file. Deployed builds only accept HTTPS origins.
  if (!__DEV__ && !configuredUrl.startsWith("https://")) return undefined;

  return configuredUrl;
}

export const apiConfig = {
  baseUrl: configuredBaseUrl() ?? inferredBaseUrl(),
};
