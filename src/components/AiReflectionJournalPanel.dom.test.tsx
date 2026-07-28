// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import AiReflectionJournalPanel from "./AiReflectionJournalPanel";

describe("AI reflection journal DOM contract", () => {
  it("показывает вопрос, мысль и результат проверки", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const onRemove = vi.fn();

    act(() => root.render(
      <AiReflectionJournalPanel
        entries={[{
          key: "position-key",
          question: "Какой ответ соперника нужно проверить?",
          answer: "Сначала оценю защиту короля.",
          updatedAt: "2026-07-28T12:00:00.000Z",
          practice: {
            outcome: "verified",
            attemptedAt: "2026-07-28T12:05:00.000Z",
          },
        }]}
        onRemove={onRemove}
        onClear={vi.fn()}
      />,
    ));

    expect(container.textContent).toContain("Проверено: совпало с расчётом");
    expect(container.textContent).toContain("Какой ответ соперника нужно проверить?");
    expect(container.textContent).toContain("Сначала оценю защиту короля.");

    const remove = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Удалить");
    act(() => remove?.click());
    expect(onRemove).toHaveBeenCalledWith("position-key");

    act(() => root.unmount());
  });
});
