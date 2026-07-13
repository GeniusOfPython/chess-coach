import { useSyncExternalStore } from "react";

export type NetworkStatus = "online" | "offline";

export function resolveNetworkStatus(isOnline: boolean): NetworkStatus {
  return isOnline ? "online" : "offline";
}

function subscribeToNetworkStatus(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);

  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getNetworkStatusSnapshot() {
  return resolveNetworkStatus(navigator.onLine);
}

export function useNetworkStatus() {
  return useSyncExternalStore(
    subscribeToNetworkStatus,
    getNetworkStatusSnapshot,
    () => "online",
  );
}
