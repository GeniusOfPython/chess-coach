import { isNativeMobileShell } from "./mobile";
import { announcePwaUpdateReady } from "./pwaUpdate";

const serviceWorkerPath = "/sw.js";
const applicationCachePrefix = "chess-coach-";

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

export function shouldAnnounceServiceWorkerUpdate({
  workerState,
  hasController,
}: {
  workerState: ServiceWorkerState;
  hasController: boolean;
}) {
  return workerState === "installed" && hasController;
}

export function shouldCleanDevelopmentPwa({
  isProduction,
  isNativeApp,
  hasServiceWorker,
}: {
  isProduction: boolean;
  isNativeApp: boolean;
  hasServiceWorker: boolean;
}) {
  return !isProduction && !isNativeApp && hasServiceWorker;
}

async function cleanDevelopmentPwa() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  const currentOrigin = window.location.origin;

  await Promise.all(
    registrations
      .filter((registration) => registration.scope.startsWith(currentOrigin))
      .map((registration) => registration.unregister()),
  );

  if (!("caches" in window)) {
    return;
  }

  const cacheKeys = await caches.keys();
  await Promise.all(
    cacheKeys
      .filter((key) => key.startsWith(applicationCachePrefix))
      .map((key) => caches.delete(key)),
  );
}

function observeServiceWorkerUpdates(registration: ServiceWorkerRegistration) {
  const observedWorkers = new WeakSet<ServiceWorker>();

  const announceWaitingWorker = () => {
    if (registration.waiting && navigator.serviceWorker.controller) {
      announcePwaUpdateReady();
    }
  };

  const observeWorker = (worker: ServiceWorker | null) => {
    if (!worker || observedWorkers.has(worker)) {
      return;
    }

    observedWorkers.add(worker);

    const checkWorkerState = () => {
      if (shouldAnnounceServiceWorkerUpdate({
        workerState: worker.state,
        hasController: Boolean(navigator.serviceWorker.controller),
      })) {
        announcePwaUpdateReady();
      }
    };

    checkWorkerState();
    worker.addEventListener("statechange", checkWorkerState);
  };

  announceWaitingWorker();
  observeWorker(registration.installing);

  registration.addEventListener("updatefound", () => {
    observeWorker(registration.installing);
  });

  return announceWaitingWorker;
}

export function registerServiceWorker() {
  const environment = {
    isProduction: import.meta.env.PROD,
    isNativeApp: isNativeMobileShell(),
    hasServiceWorker: "serviceWorker" in navigator,
  };

  if (shouldCleanDevelopmentPwa(environment)) {
    void cleanDevelopmentPwa().catch((error) => {
      console.warn("Не удалось очистить PWA-кеш разработки:", error);
    });
    return;
  }

  if (!shouldRegisterServiceWorker(environment)) {
    return;
  }

  const register = () => {
    void navigator.serviceWorker.register(serviceWorkerPath, {
      scope: "/",
      updateViaCache: "none",
    })
      .then((registration) => {
        const announceWaitingWorker = observeServiceWorkerUpdates(registration);

        return registration.update().then(announceWaitingWorker);
      })
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
