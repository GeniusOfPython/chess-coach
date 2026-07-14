import { describe, expect, it } from "vitest";
import { isAiCoachDevelopmentConfigured } from "./viteAiCoachPlugin";

describe("AI Coach development configuration", () => {
  it("включается только при наличии ключа и модели", () => {
    expect(isAiCoachDevelopmentConfigured({
      enabled: true,
      apiKey: "secret",
      model: "model",
    })).toBe(true);

    expect(isAiCoachDevelopmentConfigured({
      enabled: true,
      apiKey: "",
      model: "model",
    })).toBe(false);

    expect(isAiCoachDevelopmentConfigured({
      enabled: true,
      apiKey: "secret",
      model: "   ",
    })).toBe(false);

    expect(isAiCoachDevelopmentConfigured({
      enabled: false,
      apiKey: "secret",
      model: "model",
    })).toBe(false);
  });
});
