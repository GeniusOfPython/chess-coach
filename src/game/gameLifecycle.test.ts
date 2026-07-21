import { describe, expect, it, vi } from "vitest";
import { createGameLifecycleActions } from "./gameLifecycle";

function createDependencies(overrides: Record<string, unknown> = {}) {
  return {
    isBotThinking: false,
    gameMode: "bot" as const,
    newGame: vi.fn(),
    undoMove: vi.fn(),
    isBotTurn: vi.fn(() => false),
    loadFen: vi.fn(() => true),
    loadPgn: vi.fn(() => true),
    setSelectedSquare: vi.fn(),
    setIsBotThinking: vi.fn(),
    setIsBotGameStarted: vi.fn(),
    startBotSession: vi.fn(),
    setLastMoveReview: vi.fn(),
    setGameMode: vi.fn(),
    setPlayerSide: vi.fn(),
    clearLearningJournal: vi.fn(),
    clearGameReview: vi.fn(),
    resetBestMoveTraining: vi.fn(),
    clearAnalysis: vi.fn(),
    clearGameTermination: vi.fn(),
    ...overrides,
  };
}

describe("createGameLifecycleActions", () => {
  it("полностью очищает состояние новой партии", () => {
    const dependencies = createDependencies();
    const actions = createGameLifecycleActions(dependencies);

    actions.handleNewGame();

    expect(dependencies.newGame).toHaveBeenCalledOnce();
    expect(dependencies.setIsBotGameStarted).toHaveBeenCalledWith(false);
    expect(dependencies.clearLearningJournal).toHaveBeenCalledOnce();
    expect(dependencies.clearGameReview).toHaveBeenCalledOnce();
    expect(dependencies.clearAnalysis).toHaveBeenCalledOnce();
    expect(dependencies.startBotSession).not.toHaveBeenCalled();
  });

  it("не запускает партию через сброс доски", () => {
    const dependencies = createDependencies();
    const actions = createGameLifecycleActions(dependencies);

    actions.handleNewGame();

    expect(dependencies.newGame).toHaveBeenCalledOnce();
    expect(dependencies.startBotSession).not.toHaveBeenCalled();
  });

  it("запускает настроенную партию только явным действием", () => {
    const dependencies = createDependencies();
    const actions = createGameLifecycleActions(dependencies);

    expect(actions.handleStartBotGame()).toBe(true);

    expect(dependencies.newGame).toHaveBeenCalledOnce();
    expect(dependencies.startBotSession).toHaveBeenCalledOnce();
    expect(dependencies.clearLearningJournal).toHaveBeenCalledOnce();
  });

  it("не запускает партию во время расчёта бота", () => {
    const dependencies = createDependencies({ isBotThinking: true });
    const actions = createGameLifecycleActions(dependencies);

    expect(actions.handleStartBotGame()).toBe(false);

    expect(dependencies.newGame).not.toHaveBeenCalled();
    expect(dependencies.startBotSession).not.toHaveBeenCalled();
  });

  it("отменяет пару ходов в партии против бота", () => {
    const dependencies = createDependencies({
      isBotTurn: vi.fn(() => true),
    });
    const actions = createGameLifecycleActions(dependencies);

    actions.handleUndoMove();

    expect(dependencies.undoMove).toHaveBeenCalledTimes(2);
    expect(dependencies.clearGameReview).toHaveBeenCalledOnce();
  });

  it("не очищает данные после неудачного импорта", () => {
    const dependencies = createDependencies({
      loadFen: vi.fn(() => false),
    });
    const actions = createGameLifecycleActions(dependencies);

    expect(actions.handleImportFen("bad-fen")).toBe(false);
    expect(dependencies.setGameMode).not.toHaveBeenCalled();
    expect(dependencies.clearAnalysis).not.toHaveBeenCalled();
  });

  it("переводит успешный импорт в режим анализа", () => {
    const dependencies = createDependencies();
    const actions = createGameLifecycleActions(dependencies);

    expect(actions.handleImportPgn("1. e4")).toBe(true);
    expect(dependencies.setGameMode).toHaveBeenCalledWith("analysis");
    expect(dependencies.clearLearningJournal).toHaveBeenCalledOnce();
  });
});
