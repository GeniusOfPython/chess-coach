import { Capacitor } from "@capacitor/core";
import { normalizeNativePlatform, type NativePlatform } from "./nativeBridge";

export type AppPlatform = NativePlatform;

export function detectAppPlatform(): AppPlatform {
  const nativePlatform = normalizeNativePlatform(Capacitor.getPlatform());

  if (nativePlatform !== "web") {
    return nativePlatform;
  }

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

export function isNativeMobileShell() {
  return Capacitor.isNativePlatform();
}
