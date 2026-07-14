import { describe, expect, it } from "vitest";
import { ANALYSIS_LINE_COLORS } from "./analysisPalette";

describe("analysis line palette", () => {
  it("keeps board arrows and line markers in retrowave order", () => {
    expect(ANALYSIS_LINE_COLORS).toEqual([
      "rgba(0, 229, 255, 0.96)",
      "rgba(255, 60, 172, 0.90)",
      "rgba(255, 138, 61, 0.88)",
    ]);
  });
});
