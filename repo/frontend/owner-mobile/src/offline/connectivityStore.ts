import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { useSyncExternalStore } from "react";

export type ConnectivityStatus = "unknown" | "online" | "offline";

let status: ConnectivityStatus = "unknown";
const listeners = new Set<() => void>();
let initialized = false;

function statusFromState(state: NetInfoState): ConnectivityStatus {
  if (state.isConnected === false || state.isInternetReachable === false) {
    return "offline";
  }
  if (state.isConnected === true) return "online";
  return "unknown";
}

function initialize() {
  if (initialized) return;
  initialized = true;
  NetInfo.addEventListener((state) => {
    const next = statusFromState(state);
    if (next === status) return;
    status = next;
    listeners.forEach((listener) => listener());
  });
}

export function subscribeToConnectivity(listener: () => void) {
  initialize();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getConnectivitySnapshot() {
  initialize();
  return status;
}

export function useConnectivityStatus() {
  return useSyncExternalStore(
    subscribeToConnectivity,
    getConnectivitySnapshot,
    () => "unknown",
  );
}
