// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EngineAnalysis } from "../types/chess";
import type { AiCoachReflectionPractice } from "../repositories/aiCoachReflectionRepository";
import CoachPanel from "./CoachPanel";

const reflection = vi.hoisted(() => ({
  answer: "Сначала оценю безопасность короля.",
  saved: true,
  key: "position-key",
  practice: null as AiCoachReflectionPractice | null,
  maximumLength: 500,
  updateAnswer: vi.fn(),
  save: vi.fn(),
  clear: vi.fn(),
}));

vi.mock("../hooks/useNetworkStatus", () => ({
  useNetworkStatus: () => "online",
}));

vi.mock("../hooks/useAiCoach", () => ({
  useAiCoach: () => ({
    request: null,
    status: "success",
    adviceSource: "cache",
    advice: {
      headline: "Активизируй слона",
      explanation: "Ход развивает фигуру с темпом.",
      focusPoints: ["Развитие"],
      warning: null,
      question: "Какой ответ соперника нужно проверить первым?",
      grounding: { factIds: ["recommendation.best-move"], variationId: null },
    },
    error: null,
    remaining: 2,
    serverQuota: null,
    limitReason: null,
    requestAdvice: vi.fn(),
  }),
}));

vi.mock("../hooks/useAiCoachReflection", () => ({
  useAiCoachReflection: () => reflection,
}));

const mounted: Array<{ container: HTMLDivElement; root: Root }> = [];

const analysis: EngineAnalysis = {
  rank: 1,
  bestMove: "f1b5",
  evaluation: 0.35,
  mate: null,
  depth: 16,
  variation: ["f1b5", "b8c6"],
  lines: [{
    rank: 1,
    bestMove: "f1b5",
    evaluation: 0.35,
    mate: null,
    depth: 16,
    variation: ["f1b5", "b8c6", "e1g1"],
  }],
};

function render() {
  const onStartTraining = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  act(() => root.render(
    <CoachPanel
      analysis={analysis}
      position="rn1qkbnr/pppb1ppp/3pp3/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 4"
      access={{
        tier: "free",
        aiCoachQuota: { limit: 3, period: "day" },
      } as never}
      onStartTraining={onStartTraining}
    />,
  ));
  mounted.push({ container, root });

  return { container, onStartTraining };
}

afterEach(() => {
  reflection.answer = "Сначала оценю безопасность короля.";
  reflection.saved = true;
  reflection.key = "position-key";
  reflection.practice = null;
  reflection.updateAnswer.mockReset();
  reflection.save.mockReset();
  reflection.clear.mockReset();

  for (const { container, root } of mounted.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
});

describe("CoachPanel DOM contract", () => {
  it("показывает вопрос ИИ и сохраняет мысль пользователя", () => {
    reflection.saved = false;
    const { container } = render();
    const answer = container.querySelector<HTMLTextAreaElement>(
      "#ai-coach-reflection-answer",
    );
    const saveButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Сохранить мысль");

    expect(container.textContent).toContain("Какой ответ соперника нужно проверить первым?");
    expect(answer?.value).toBe("Сначала оценю безопасность короля.");
    expect(saveButton).toBeInstanceOf(HTMLButtonElement);

    act(() => saveButton?.click());

    expect(reflection.save).toHaveBeenCalledOnce();
  });

  it("открывает тренировку только после сохранения мысли", () => {
    const { container, onStartTraining } = render();
    const trainingButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Проверить мысль на доске");

    expect(trainingButton).toBeInstanceOf(HTMLButtonElement);
    expect(trainingButton).not.toHaveProperty("disabled", true);

    act(() => trainingButton?.click());

    expect(onStartTraining).toHaveBeenCalledOnce();
    expect(onStartTraining).toHaveBeenCalledWith({
      answer: "Сначала оценю безопасность короля.",
      question: "Какой ответ соперника нужно проверить первым?",
      reflectionKey: "position-key",
      target: {
        positionFen: "rn1qkbnr/pppb1ppp/3pp3/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 4",
        bestMove: "f1b5",
      },
    });
  });

  it("не позволяет открыть тренировку с несохранённым ответом", () => {
    reflection.saved = false;
    const { container, onStartTraining } = render();
    const trainingButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Проверить мысль на доске");

    expect(trainingButton).toHaveProperty("disabled", true);

    act(() => trainingButton?.click());

    expect(onStartTraining).not.toHaveBeenCalled();
  });

  it("показывает сохранённый исход проверки", () => {
    reflection.practice = {
      outcome: "verified",
      attemptedAt: "2026-07-28T12:05:00.000Z",
    };
    const { container } = render();

    expect(container.textContent).toContain("Проверено на доске: ход совпал с расчётом.");
  });
});
