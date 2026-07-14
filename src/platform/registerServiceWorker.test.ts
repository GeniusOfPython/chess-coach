import { describe, expect, it } from "vitest";
import {
  shouldAnnounceServiceWorkerUpdate,
  shouldCleanDevelopmentPwa,
  shouldRegisterServiceWorker,
} from "./registerServiceWorker";

describe("shouldRegisterServiceWorker", () => {
  it("регистрирует PWA только в production web", () => {
    expect(shouldRegisterServiceWorker({
      isProduction: true,
      isNativeApp: false,
      hasServiceWorker: true,
    })).toBe(true);

    expect(shouldRegisterServiceWorker({
      isProduction: false,
      isNativeApp: false,
      hasServiceWorker: true,
    })).toBe(false);

    expect(shouldRegisterServiceWorker({
      isProduction: true,
      isNativeApp: true,
      hasServiceWorker: true,
    })).toBe(false);

    expect(shouldRegisterServiceWorker({
      isProduction: true,
      isNativeApp: false,
      hasServiceWorker: false,
    })).toBe(false);
  });
});

describe("development PWA cleanup", () => {
  it("удаляет старый web service worker только в режиме разработки", () => {
    expect(shouldCleanDevelopmentPwa({
      isProduction: false,
      isNativeApp: false,
      hasServiceWorker: true,
    })).toBe(true);

    expect(shouldCleanDevelopmentPwa({
      isProduction: true,
      isNativeApp: false,
      hasServiceWorker: true,
    })).toBe(false);

    expect(shouldCleanDevelopmentPwa({
      isProduction: false,
      isNativeApp: true,
      hasServiceWorker: true,
    })).toBe(false);
  });
});

describe("shouldAnnounceServiceWorkerUpdate", () => {
  it("показывает обновление только после установки новой версии", () => {
    expect(shouldAnnounceServiceWorkerUpdate({
      workerState: "installed",
      hasController: true,
    })).toBe(true);

    expect(shouldAnnounceServiceWorkerUpdate({
      workerState: "installed",
      hasController: false,
    })).toBe(false);

    expect(shouldAnnounceServiceWorkerUpdate({
      workerState: "activated",
      hasController: true,
    })).toBe(false);
  });
});
