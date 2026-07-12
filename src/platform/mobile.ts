export type AppPlatform = "web" | "android" | "ios";

export function detectAppPlatform(): AppPlatform {
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (userAgent.includes("android")) {
    return "android";
  }

  if (
    userAgent.includes("iphone") ||
    userAgent.includes("ipad") ||
    userAgent.includes("ipod")
  ) {
    return "ios";
  }

  return "web";
}

export function isTouchDevice() {
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.navigator.maxTouchPoints > 0
  );
}


type CapacitorBridge = {
  isNativePlatform?: () => boolean;
};

export function isNativeMobileShell() {
  const globalWindow = window as Window & {
    Capacitor?: CapacitorBridge;
  };

  return Boolean(
    globalWindow.Capacitor?.isNativePlatform?.(),
  );
}
