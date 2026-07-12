export type NativePlatform = "web" | "android" | "ios";

export type NativeBridgeState = {
  platform: NativePlatform;
  isNative: boolean;
  supportsAds: boolean;
  supportsPurchases: boolean;
  supportsHaptics: boolean;
};

type CapacitorLike = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

type NativeHapticsLike = {
  impact?: (options: { style: "LIGHT" | "MEDIUM" }) => Promise<void>;
  notification?: (options: { type: "SUCCESS" | "WARNING" | "ERROR" }) => Promise<void>;
};

function getCapacitor() {
  return (window as unknown as {
    Capacitor?: CapacitorLike;
  }).Capacitor;
}

function getNativeHaptics() {
  return (window as unknown as {
    Haptics?: NativeHapticsLike;
  }).Haptics;
}

function readCapacitorPlatform(): NativePlatform {
  const platform = getCapacitor()?.getPlatform?.();

  if (platform === "android" || platform === "ios") {
    return platform;
  }

  return "web";
}

function canUseBrowserVibration() {
  return typeof window.navigator.vibrate === "function";
}

function vibrate(pattern: number | number[]) {
  if (!canUseBrowserVibration()) {
    return;
  }

  window.navigator.vibrate(pattern);
}

async function triggerNativeImpact(style: "LIGHT" | "MEDIUM") {
  const capacitor = getCapacitor();

  if (!capacitor?.isNativePlatform?.()) {
    return false;
  }

  const haptics = getNativeHaptics();

  if (!haptics?.impact) {
    return false;
  }

  await haptics.impact({ style });
  return true;
}

async function triggerNativeNotification(
  type: "SUCCESS" | "WARNING" | "ERROR",
) {
  const capacitor = getCapacitor();

  if (!capacitor?.isNativePlatform?.()) {
    return false;
  }

  const haptics = getNativeHaptics();

  if (!haptics?.notification) {
    return false;
  }

  await haptics.notification({ type });
  return true;
}

export function getNativeBridgeState(): NativeBridgeState {
  const platform = readCapacitorPlatform();
  const isNative = platform === "android" || platform === "ios";

  return {
    platform,
    isNative,
    supportsAds: isNative,
    supportsPurchases: isNative,
    supportsHaptics: isNative || canUseBrowserVibration(),
  };
}

export async function triggerLightHaptic() {
  if (await triggerNativeImpact("LIGHT")) {
    return;
  }

  vibrate(8);
}

export async function triggerMoveHaptic() {
  if (await triggerNativeImpact("MEDIUM")) {
    return;
  }

  vibrate(14);
}

export async function triggerSuccessHaptic() {
  if (await triggerNativeNotification("SUCCESS")) {
    return;
  }

  vibrate([12, 24, 12]);
}

export async function triggerWarningHaptic() {
  if (await triggerNativeNotification("WARNING")) {
    return;
  }

  vibrate([16, 28, 16]);
}

export async function triggerErrorHaptic() {
  if (await triggerNativeNotification("ERROR")) {
    return;
  }

  vibrate([24, 32, 24]);
}
