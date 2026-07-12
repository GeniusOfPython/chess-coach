const serviceWorkerPath = "/sw.js";

export function registerServiceWorker() {
  if (!import.meta.env.PROD) {
    return;
  }

  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register(serviceWorkerPath)
      .catch((error) => {
        console.warn(
          "Не удалось зарегистрировать service worker:",
          error,
        );
      });
  });
}
