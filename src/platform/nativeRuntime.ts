import { App } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { normalizeNativePlatform, type NativePlatform } from "./nativeBridge";
import { dispatchNativeDeepLink, nativeRuntimeEvents } from "./nativeEvents";

export type NativeBackAction = "none" | "history" | "exit";

export function resolveNativeBackAction({
  handled,
  canGoBack,
  platform,
}: {
  handled: boolean;
  canGoBack: boolean;
  platform: NativePlatform;
}): NativeBackAction {
  if (handled) {
    return "none";
  }

  if (canGoBack) {
    return "history";
  }

  return platform === "android" ? "exit" : "none";
}

function setKeyboardState(open: boolean, height = 0) {
  document.documentElement.classList.toggle("native-keyboard-open", open);
  document.documentElement.style.setProperty(
    "--native-keyboard-height",
    `${Math.max(0, Math.round(height))}px`,
  );
}

async function configureNativeChrome(platform: NativePlatform) {
  const tasks: Promise<unknown>[] = [
    StatusBar.setStyle({ style: Style.Light }),
    StatusBar.setOverlaysWebView({ overlay: false }),
  ];

  if (platform === "android") {
    tasks.push(StatusBar.setBackgroundColor({ color: "#050617" }));
  }

  const results = await Promise.allSettled(tasks);
  const rejected = results.find((result) => result.status === "rejected");

  if (rejected?.status === "rejected") {
    console.warn("Часть нативного интерфейса не настроена:", rejected.reason);
  }
}

async function installNativeListeners(platform: NativePlatform) {
  const handles: PluginListenerHandle[] = [];

  handles.push(await App.addListener("appStateChange", ({ isActive }) => {
    document.documentElement.dataset.appState = isActive ? "active" : "background";

    if (isActive) {
      window.dispatchEvent(new Event(nativeRuntimeEvents.resume));
    }
  }));

  handles.push(await App.addListener("appUrlOpen", ({ url }) => {
    dispatchNativeDeepLink(url);
  }));

  handles.push(await App.addListener("backButton", async ({ canGoBack }) => {
    const shouldRunDefault = window.dispatchEvent(
      new Event(nativeRuntimeEvents.back, { cancelable: true }),
    );
    const action = resolveNativeBackAction({
      handled: !shouldRunDefault,
      canGoBack,
      platform,
    });

    if (action === "history") {
      window.history.back();
    } else if (action === "exit") {
      await App.exitApp();
    }
  }));

  handles.push(await Keyboard.addListener("keyboardWillShow", ({ keyboardHeight }) => {
    setKeyboardState(true, keyboardHeight);
  }));
  handles.push(await Keyboard.addListener("keyboardDidHide", () => {
    setKeyboardState(false);
  }));

  return async () => {
    await Promise.allSettled(handles.map((handle) => handle.remove()));
    setKeyboardState(false);
  };
}

let initialization: Promise<(() => Promise<void>) | null> | null = null;

export function initializeNativeRuntime() {
  if (initialization) {
    return initialization;
  }

  if (!Capacitor.isNativePlatform()) {
    initialization = Promise.resolve(null);
    return initialization;
  }

  initialization = (async () => {
    const platform = normalizeNativePlatform(Capacitor.getPlatform());
    document.documentElement.dataset.nativePlatform = platform;

    await configureNativeChrome(platform);

    try {
      return await installNativeListeners(platform);
    } catch (error) {
      console.warn("Нативные lifecycle-события недоступны:", error);
      return null;
    }
  })();

  return initialization;
}

export async function finishNativeLaunch() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await SplashScreen.hide();
  } catch (error) {
    console.warn("Не удалось скрыть нативный splash screen:", error);
  }
}
