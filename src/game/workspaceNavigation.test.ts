import { describe, expect, it } from "vitest";
import { toggleWorkspace } from "./workspaceNavigation";

describe("workspace navigation", () => {
  it("закрывает повторно выбранную область", () => {
    expect(toggleWorkspace("coach", "coach")).toBeNull();
  });

  it("открывает другую или закрытую область", () => {
    expect(toggleWorkspace("coach", "game")).toBe("game");
    expect(toggleWorkspace(null, "tools")).toBe("tools");
  });
});
