// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GameReviewPanel from "./GameReviewPanel";

type Props = ComponentProps<typeof GameReviewPanel>;

const initialPosition = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const reviewItems: Props["items"] = [
  {
    id: "review-3",
    positionFen: initialPosition,
    positionIndex: 4,
    moveNumber: 3,
    side: "w",
    playedMove: "g1f3",
    bestMove: "e2e4",
    verdict: "blunder",
    evaluationBeforeWhite: 2,
    evaluationAfterWhite: -1,
    evaluationLoss: 3,
    isPlayerDecision: true,
  },
  {
    id: "review-5",
    positionFen: initialPosition,
    positionIndex: 8,
    moveNumber: 5,
    side: "w",
    playedMove: "b1c3",
    bestMove: "d2d4",
    verdict: "mistake",
    evaluationBeforeWhite: 0.7,
    evaluationAfterWhite: -0.1,
    evaluationLoss: 0.8,
    isPlayerDecision: true,
  },
  {
    id: "review-6",
    positionFen: initialPosition,
    positionIndex: 10,
    moveNumber: 6,
    side: "b",
    playedMove: "g8f6",
    bestMove: "g8f6",
    verdict: "good",
    evaluationBeforeWhite: 0,
    evaluationAfterWhite: 0,
    evaluationLoss: 0,
    isPlayerDecision: false,
  },
];

const mounted: Array<{ container: HTMLDivElement; root: Root }> = [];

function render(overrides: Partial<Props> = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const props: Props = {
    status: "done",
    progress: reviewItems.length,
    total: reviewItems.length,
    items: reviewItems,
    error: "",
    restoredProgress: false,
    cachedPositions: 0,
    selectedPositionIndex: -1,
    onRun: vi.fn(),
    onPause: vi.fn(),
    onClear: vi.fn(),
    onSelectPosition: vi.fn(),
    onPracticeMainMistake: vi.fn(),
    onPracticeSequence: vi.fn(),
    ...overrides,
  };

  act(() => root.render(<GameReviewPanel {...props} />));
  mounted.push({ container, root });

  return { container, props };
}

afterEach(() => {
  for (const { container, root } of mounted.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
});

describe("GameReviewPanel DOM contract", () => {
  it("оставляет доступным график и переход к главному переломному моменту", () => {
    const onSelectPosition = vi.fn();
    const { container } = render({ onSelectPosition });
    const marker = container.querySelector<HTMLButtonElement>(
      '[aria-label="Открыть переломный момент 1, ход 3"]',
    );

    expect(container.textContent).toContain("Как менялся баланс позиции");
    expect(marker).toBeInstanceOf(HTMLButtonElement);

    act(() => marker?.click());

    expect(onSelectPosition).toHaveBeenCalledWith(reviewItems[0]);
  });

  it("сохраняет запуск тренировки одного и всех ключевых моментов", () => {
    const onPracticeMainMistake = vi.fn();
    const onPracticeSequence = vi.fn();
    const { container } = render({
      onPracticeMainMistake,
      onPracticeSequence,
    });
    const sequenceButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Пройти все моменты · 2");
    const mainMomentButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Только этот момент");

    expect(sequenceButton).toBeInstanceOf(HTMLButtonElement);
    expect(mainMomentButton).toBeInstanceOf(HTMLButtonElement);

    act(() => sequenceButton?.click());
    act(() => mainMomentButton?.click());

    expect(onPracticeSequence).toHaveBeenCalledWith([
      reviewItems[0],
      reviewItems[1],
    ]);
    expect(onPracticeMainMistake).toHaveBeenCalledWith(reviewItems[0]);
  });
});
