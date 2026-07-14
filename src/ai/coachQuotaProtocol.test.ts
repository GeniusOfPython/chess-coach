import { describe, expect, it } from "vitest";
import {
  createAiCoachQuotaHeaders,
  parseAiCoachQuotaHeaders,
} from "./coachQuotaProtocol";

describe("AI Coach quota protocol", () => {
  it("передаёт проверенную серверную квоту через заголовки", () => {
    const quota = {
      tier: "premium",
      period: "month",
      limit: 300,
      remaining: 299,
    } as const;
    const headers = new Headers(createAiCoachQuotaHeaders(quota));

    expect(parseAiCoachQuotaHeaders(headers)).toEqual(quota);
  });

  it("отбрасывает противоречивые значения", () => {
    const headers = new Headers({
      "X-AI-Coach-Quota-Tier": "premium",
      "X-AI-Coach-Quota-Period": "month",
      "X-AI-Coach-Quota-Limit": "300",
      "X-AI-Coach-Quota-Remaining": "301",
    });

    expect(parseAiCoachQuotaHeaders(headers)).toBeNull();
  });
});
