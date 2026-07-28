import { Capacitor } from "@capacitor/core";

export type NativePlatform = "web" | "android" | "ios";

export type NativeBridgeState = {
  platform: NativePlatform;
  isNative: boolean;
  supportsAds: boolean;
  supportsPurchases: boolean;
  supportsHaptics: boolean;
};

export function normalizeNativePlatform(platform: string): NativePlatform {
  return platform === "android" || platform === "ios" ? platform : "web";
}

function canUseBrowserVibration() {
  return typeof window.navigator.vibrate === "function";
}

function vibrate(pattern: number | number[]) {
  if (canUseBrowserVibration()) {
    window.navigator.vibrate(pattern);
  }
}

async function tryNativeHaptic(
  action: (plugin: typeof import("@capacitor/haptics")) => Promise<void>,
) {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    await action(await import("@capacitor/haptics"));
    return true;
  } catch (error) {
    console.warn("Нативный haptic недоступен:", error);
    return false;
  }
}

export function getNativeBridgeState(): NativeBridgeState {
  const platform = normalizeNativePlatform(Capacitor.getPlatform());
  const isNative = Capacitor.isNativePlatform();

  return {
    platform,
    isNative,
    supportsAds: isNative,
    supportsPurchases: isNative,
    supportsHaptics: isNative || canUseBrowserVibration(),
  };
}

export async function triggerLightHaptic() {
  if (
    await tryNativeHaptic(({ Haptics, ImpactStyle }) =>
      Haptics.impact({ style: ImpactStyle.Light })
    )
  ) {
    return;
  }

  vibrate(8);
}

export async function triggerMoveHaptic() {
  if (
    await tryNativeHaptic(({ Haptics, ImpactStyle }) =>
      Haptics.impact({ style: ImpactStyle.Medium })
    )
  ) {
    return;
  }

  vibrate(14);
}

export async function triggerSuccessHaptic() {
  if (
    await tryNativeHaptic(({ Haptics, NotificationType }) =>
      Haptics.notification({ type: NotificationType.Success })
    )
  ) {
    return;
  }

  vibrate([12, 24, 12]);
}

export async function triggerWarningHaptic() {
  if (
    await tryNativeHaptic(({ Haptics, NotificationType }) =>
      Haptics.notification({ type: NotificationType.Warning })
    )
  ) {
    return;
  }

  vibrate([16, 28, 16]);
}

export async function triggerErrorHaptic() {
  if (
    await tryNativeHaptic(({ Haptics, NotificationType }) =>
      Haptics.notification({ type: NotificationType.Error })
    )
  ) {
    return;
  }

  vibrate([24, 32, 24]);
}
