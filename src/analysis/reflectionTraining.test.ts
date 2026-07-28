import { describe, expect, it } from "vitest";
import { createAiReflectionTrainingContext } from "./reflectionTraining";

describe("AI reflection training context", () => {
  it("сохраняет только заполненную мысль и вопрос", () => {
    expect(createAiReflectionTrainingContext({
      answer: "  Сначала проверю защиту короля.  ",
      question: "  Как соперник отвечает на ход?  ",
      reflectionKey: " position-key ",
      target: {
        positionFen: "rn1qkbnr/pppb1ppp/3pp3/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 4",
        bestMove: "f1b5",
      },
    })).toEqual({
      kind: "ai_reflection",
      answer: "Сначала проверю защиту короля.",
      question: "Как соперник отвечает на ход?",
      reflectionKey: "position-key",
      target: {
        positionFen: "rn1qkbnr/pppb1ppp/3pp3/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 4",
        bestMove: "f1b5",
      },
    });
  });

  it("не создаёт задачу без самостоятельной мысли", () => {
    expect(createAiReflectionTrainingContext({
      answer: "   ",
      question: "Как соперник отвечает на ход?",
      reflectionKey: "position-key",
      target: {
        positionFen: "rn1qkbnr/pppb1ppp/3pp3/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 4",
        bestMove: "f1b5",
      },
    })).toBeNull();
  });

  it("отклоняет несуществующий ход из сохранённой позиции", () => {
    expect(createAiReflectionTrainingContext({
      answer: "Проверю защиту короля.",
      question: "Как соперник отвечает на ход?",
      reflectionKey: "position-key",
      target: {
        positionFen: "rn1qkbnr/pppb1ppp/3pp3/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 4",
        bestMove: "a1a8",
      },
    })).toBeNull();
  });
});
