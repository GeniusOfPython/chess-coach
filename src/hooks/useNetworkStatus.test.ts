import { describe, expect, it } from "vitest";
import { resolveNetworkStatus } from "./useNetworkStatus";

describe("resolveNetworkStatus", () => {
  it("преобразует состояние браузера в статус приложения", () => {
    expect(resolveNetworkStatus(true)).toBe("online");
    expect(resolveNetworkStatus(false)).toBe("offline");
  });
});
