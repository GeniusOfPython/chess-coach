export type NativePlatform = "web" | "android" | "ios";

export type NativeBridgeState = {
  platform: NativePlatform;
  isNative: boolean;
  supportsAds: boolean;
  supportsPurchases: boolean;
  supportsHaptics: boolean;
};

function readCapacitorPlatform(): NativePlatform {
  const capacitor = (window as unknown as {
    Capacitor?: {
      getPlatform?: () => string;
      isNativePlatform?: () => boolean;
    };
  }).Capacitor;

  const platform = capacitor?.getPlatform?.();

  if (platform === "android" || platform === "ios") {
    return platform;
  }

  return "web";
}

export function getNativeBridgeState(): NativeBridgeState {
  const platform = readCapacitorPlatform();
  const isNative = platform === "android" || platform === "ios";

  return {
    platform,
    isNative,
    supportsAds: isNative,
    supportsPurchases: isNative,
    supportsHaptics: isNative,
  };
}

export async function triggerLightHaptic() {
  const capacitor = (window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  }).Capacitor;

  if (!capacitor?.isNativePlatform?.()) {
    return;
  }

  const haptics = (window as unknown as {
    Haptics?: {
      impact?: (options: { style: "LIGHT" }) => Promise<void>;
    };
  }).Haptics;

  await haptics?.impact?.({ style: "LIGHT" });
}
