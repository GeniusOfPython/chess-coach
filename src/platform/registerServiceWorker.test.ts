import { describe, expect, it } from "vitest";
import { shouldRegisterServiceWorker } from "./registerServiceWorker";

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
