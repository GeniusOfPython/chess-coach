import { describe, expect, it } from "vitest";
import { createAiReflectionTrainingContext } from "./reflectionTraining";

describe("AI reflection training context", () => {
  it("сохраняет только заполненную мысль и вопрос", () => {
    expect(createAiReflectionTrainingContext({
      answer: "  Сначала проверю защиту короля.  ",
      question: "  Как соперник отвечает на ход?  ",
    })).toEqual({
      kind: "ai_reflection",
      answer: "Сначала проверю защиту короля.",
      question: "Как соперник отвечает на ход?",
    });
  });

  it("не создаёт задачу без самостоятельной мысли", () => {
    expect(createAiReflectionTrainingContext({
      answer: "   ",
      question: "Как соперник отвечает на ход?",
    })).toBeNull();
  });
});
