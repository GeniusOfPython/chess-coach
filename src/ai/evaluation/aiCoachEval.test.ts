import { describe, expect, it } from "vitest";
import {
  formatAiCoachEvalReport,
  runAiCoachEval,
  type AiCoachEvalCase,
} from "./aiCoachEval";
import { aiCoachEvalCases } from "./aiCoachEvalCases";

describe("AI Coach factual eval", () => {
  it("проходит релизные пороги точности и защиты от галлюцинаций", () => {
    const report = runAiCoachEval(aiCoachEvalCases);

    console.info(`\n${formatAiCoachEvalReport(report)}\n`);

    expect(report.releasePassed).toBe(true);
    expect(report.failed).toBe(0);
    expect(report.hallucinationBlockRate).toBe(1);
  });

  it("показывает конкретный провал вместо ложного общего успеха", () => {
    const regression: AiCoachEvalCase = {
      ...aiCoachEvalCases[0]!,
      id: "regression-missing-grounding",
      requiredFactIds: ["motif.fact-that-does-not-exist"],
    };
    const report = runAiCoachEval([regression]);

    expect(report.releasePassed).toBe(false);
    expect(report.results[0]?.failure).toContain("обязательное основание");
  });

  it("отклоняет повтор идентификатора кейса", () => {
    expect(() => runAiCoachEval([
      aiCoachEvalCases[0]!,
      aiCoachEvalCases[0]!,
    ])).toThrow("Повтор идентификатора");
  });
});
