import {
  parseAiCoachResponse,
  type AiCoachRequest,
} from "../coachContract";

export type AiCoachEvalRisk =
  | "grounding"
  | "unsupported-move"
  | "variation"
  | "schema";

export type AiCoachEvalCase = {
  id: string;
  title: string;
  request: AiCoachRequest;
  candidate: unknown;
  expected: "accept" | "reject";
  risk: AiCoachEvalRisk;
  requiredFactIds?: string[];
  requiredVariationId?: string | null;
};

export type AiCoachEvalCaseResult = {
  id: string;
  title: string;
  risk: AiCoachEvalRisk;
  expected: "accept" | "reject";
  actual: "accept" | "reject";
  passed: boolean;
  failure: string | null;
};

export type AiCoachEvalReport = {
  total: number;
  passed: number;
  failed: number;
  acceptanceAccuracy: number;
  groundingAccuracy: number;
  hallucinationBlockRate: number;
  variationAccuracy: number;
  schemaAccuracy: number;
  releasePassed: boolean;
  results: AiCoachEvalCaseResult[];
};

const releaseThresholds = {
  acceptanceAccuracy: 1,
  groundingAccuracy: 1,
  hallucinationBlockRate: 1,
  variationAccuracy: 1,
  schemaAccuracy: 1,
} as const;

function ratio(passed: number, total: number) {
  return total === 0 ? 1 : passed / total;
}

function evaluateCase(testCase: AiCoachEvalCase): AiCoachEvalCaseResult {
  try {
    const parsed = parseAiCoachResponse(testCase.candidate, testCase.request);

    if (testCase.expected === "reject") {
      return {
        id: testCase.id,
        title: testCase.title,
        risk: testCase.risk,
        expected: testCase.expected,
        actual: "accept",
        passed: false,
        failure: "Опасный ответ прошёл проверку",
      };
    }

    const factIds = new Set(parsed.advice.grounding.factIds);
    const missingFact = testCase.requiredFactIds?.find(
      (factId) => !factIds.has(factId),
    );

    if (missingFact) {
      return {
        id: testCase.id,
        title: testCase.title,
        risk: testCase.risk,
        expected: testCase.expected,
        actual: "accept",
        passed: false,
        failure: `Не указано обязательное основание ${missingFact}`,
      };
    }

    if (
      testCase.requiredVariationId !== undefined &&
      parsed.advice.grounding.variationId !== testCase.requiredVariationId
    ) {
      return {
        id: testCase.id,
        title: testCase.title,
        risk: testCase.risk,
        expected: testCase.expected,
        actual: "accept",
        passed: false,
        failure: "Ответ не сослался на обязательный проверенный вариант",
      };
    }

    return {
      id: testCase.id,
      title: testCase.title,
      risk: testCase.risk,
      expected: testCase.expected,
      actual: "accept",
      passed: true,
      failure: null,
    };
  } catch (error) {
    return {
      id: testCase.id,
      title: testCase.title,
      risk: testCase.risk,
      expected: testCase.expected,
      actual: "reject",
      passed: testCase.expected === "reject",
      failure: testCase.expected === "reject"
        ? null
        : error instanceof Error
          ? error.message
          : "Неизвестная ошибка проверки",
    };
  }
}

function accuracyForRisk(
  results: AiCoachEvalCaseResult[],
  risk: AiCoachEvalRisk,
) {
  const selected = results.filter((result) => result.risk === risk);
  return ratio(
    selected.filter((result) => result.passed).length,
    selected.length,
  );
}

export function runAiCoachEval(cases: AiCoachEvalCase[]): AiCoachEvalReport {
  const ids = new Set<string>();

  for (const testCase of cases) {
    if (ids.has(testCase.id)) {
      throw new Error(`Повтор идентификатора eval-кейса: ${testCase.id}`);
    }

    ids.add(testCase.id);
  }

  const results = cases.map(evaluateCase);
  const passed = results.filter((result) => result.passed).length;
  const acceptanceAccuracy = ratio(passed, results.length);
  const groundingAccuracy = accuracyForRisk(results, "grounding");
  const hallucinationBlockRate = accuracyForRisk(results, "unsupported-move");
  const variationAccuracy = accuracyForRisk(results, "variation");
  const schemaAccuracy = accuracyForRisk(results, "schema");
  const releasePassed =
    acceptanceAccuracy >= releaseThresholds.acceptanceAccuracy &&
    groundingAccuracy >= releaseThresholds.groundingAccuracy &&
    hallucinationBlockRate >= releaseThresholds.hallucinationBlockRate &&
    variationAccuracy >= releaseThresholds.variationAccuracy &&
    schemaAccuracy >= releaseThresholds.schemaAccuracy;

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    acceptanceAccuracy,
    groundingAccuracy,
    hallucinationBlockRate,
    variationAccuracy,
    schemaAccuracy,
    releasePassed,
    results,
  };
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatAiCoachEvalReport(report: AiCoachEvalReport) {
  const status = report.releasePassed ? "PASSED" : "FAILED";
  const failedCases = report.results
    .filter((result) => !result.passed)
    .map((result) => `- ${result.id}: ${result.failure ?? "проверка не пройдена"}`);

  return [
    `AI Coach factual eval: ${status}`,
    `Cases: ${report.passed}/${report.total}`,
    `Acceptance accuracy: ${percent(report.acceptanceAccuracy)}`,
    `Grounding accuracy: ${percent(report.groundingAccuracy)}`,
    `Hallucination block rate: ${percent(report.hallucinationBlockRate)}`,
    `Variation accuracy: ${percent(report.variationAccuracy)}`,
    `Schema accuracy: ${percent(report.schemaAccuracy)}`,
    ...failedCases,
  ].join("\n");
}
