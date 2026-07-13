import { isNativeMobileShell } from "./mobile";

const serviceWorkerPath = "/sw.js";

export function shouldRegisterServiceWorker({
  isProduction,
  isNativeApp,
  hasServiceWorker,
}: {
  isProduction: boolean;
  isNativeApp: boolean;
  hasServiceWorker: boolean;
}) {
  return isProduction && !isNativeApp && hasServiceWorker;
}

export function registerServiceWorker() {
  if (!shouldRegisterServiceWorker({
    isProduction: import.meta.env.PROD,
    isNativeApp: isNativeMobileShell(),
    hasServiceWorker: "serviceWorker" in navigator,
  })) {
    return;
  }

  const register = () => {
    void navigator.serviceWorker.register(serviceWorkerPath, {
      scope: "/",
      updateViaCache: "none",
    })
      .then((registration) => registration.update())
      .catch((error) => {
        console.warn(
          "Не удалось зарегистрировать service worker:",
          error,
        );
      });
  };

  if (document.readyState === "complete") {
    register();
    return;
  }

  window.addEventListener("load", register, { once: true });
}
