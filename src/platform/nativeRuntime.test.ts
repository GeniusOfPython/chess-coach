import { describe, expect, it } from "vitest";
import { resolveNativeBackAction } from "./nativeRuntime";

describe("resolveNativeBackAction", () => {
  it("не выполняет системное действие, когда интерфейс обработал возврат", () => {
    expect(resolveNativeBackAction({
      handled: true,
      canGoBack: true,
      platform: "android",
    })).toBe("none");
  });

  it("возвращается по истории WebView, если это возможно", () => {
    expect(resolveNativeBackAction({
      handled: false,
      canGoBack: true,
      platform: "android",
    })).toBe("history");
  });

  it("закрывает Android-приложение только на корневом экране", () => {
    expect(resolveNativeBackAction({
      handled: false,
      canGoBack: false,
      platform: "android",
    })).toBe("exit");
    expect(resolveNativeBackAction({
      handled: false,
      canGoBack: false,
      platform: "ios",
    })).toBe("none");
  });
});
