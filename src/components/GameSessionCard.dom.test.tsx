// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import GameSessionCard from "./GameSessionCard";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof GameSessionCard>;

const mounted: Array<{ container: HTMLDivElement; root: Root }> = [];

function render(overrides: Partial<Props> = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const props: Props = {
    stateText: "Ваш ход",
    active: true,
    turnOwner: "player",
    onRetry: vi.fn(),
    ...overrides,
  };

  act(() => root.render(<GameSessionCard {...props} />));
  mounted.push({ container, root });
  return { container, props };
}

afterEach(() => {
  for (const { container, root } of mounted.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
});

describe("GameSessionCard DOM contract", () => {
  it("показывает активную партию и очередь хода игрока", () => {
    const { container } = render();

    expect(container.querySelector("[data-testid=active-game-indicator]")?.textContent)
      .toContain("Партия идёт");
    expect(container.textContent).toContain("Ваш ход");
    expect(container.querySelector(".turn-indicator-player")).not.toBeNull();
  });

  it("показывает очередь хода бота", () => {
    const { container } = render({
      stateText: "Бот думает…",
      turnOwner: "bot",
    });

    expect(container.textContent).toContain("Ход бота");
    expect(container.querySelector(".turn-indicator-bot")).not.toBeNull();
  });

  it("даёт повторить неудавшийся ход бота", () => {
    const onRetry = vi.fn();
    const { container } = render({
      error: "Не удалось выполнить ход бота.",
      onRetry,
    });
    const retryButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Повторить ход");

    expect(container.querySelector("[role=alert]")?.textContent)
      .toContain("Не удалось выполнить ход бота.");
    expect(retryButton).toBeInstanceOf(HTMLButtonElement);

    act(() => retryButton?.click());

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("не оставляет устаревшую кнопку повтора после завершения партии", () => {
    const { container } = render({
      active: false,
      turnOwner: null,
      error: "Не удалось выполнить ход бота.",
    });

    expect(container.querySelector("[data-testid=active-game-indicator]")).toBeNull();
    expect(container.textContent).not.toContain("Повторить ход");
    expect(container.querySelector("[role=alert]")).toBeNull();
  });
});
