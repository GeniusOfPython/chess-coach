// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChessCoachController } from "./useChessCoachController";
import ChessCoachView from "./ChessCoachView";

vi.mock("../components/ChessBoard", () => ({
  default: () => <div data-testid="chess-board" />,
}));

vi.mock("../components/AnalysisPanel", () => ({
  default: () => null,
}));

vi.mock("../components/CoachPanel", () => ({
  default: () => null,
}));

vi.mock("../components/BestMoveTrainingPanel", () => ({
  default: () => null,
}));

vi.mock("../components/GameControls", () => ({
  default: () => null,
}));

vi.mock("../components/GameModeSelector", () => ({
  default: () => null,
}));

vi.mock("../components/PlayerSideSelector", () => ({
  default: () => null,
}));

vi.mock("../components/BotLevelSelector", () => ({
  default: () => null,
}));

vi.mock("../components/GameSessionCard", () => ({
  default: () => null,
}));

vi.mock("../components/MoveFeedbackCard", () => ({
  default: () => null,
}));

vi.mock("../components/BotFairPlayNotice", () => ({
  default: () => null,
}));

vi.mock("../components/CollapsibleSection", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../components/WorkspaceTabs", () => ({
  default: ({
    onChange,
  }: {
    onChange: (workspace: "coach" | "game" | "tools" | null) => void;
  }) => (
    <nav aria-label="Рабочая область">
      <button type="button" onClick={() => onChange("coach")}>Учёба</button>
      <button type="button" onClick={() => onChange("game")}>Партия</button>
      <button type="button" onClick={() => onChange("tools")}>Ещё</button>
    </nav>
  ),
}));

vi.mock("../components/RewardToast", () => ({
  default: () => null,
}));

vi.mock("../components/GameResultCelebration", () => ({
  default: () => null,
}));

vi.mock("../components/AdSlot", () => ({
  default: () => null,
}));

vi.mock("../components/ConsentBanner", () => ({
  default: () => null,
}));

const mounted: Array<{ container: HTMLDivElement; root: Root }> = [];

function createController(overrides: Partial<ChessCoachController> = {}) {
  const setActiveWorkspace = vi.fn();
  const handleStartBotGame = vi.fn();

  const controller = {
    preferences: {
      compactUi: false,
      gameMode: "bot",
      setGameMode: vi.fn(),
      playerSide: "w",
      setPlayerSide: vi.fn(),
      botLevelId: "beginner",
      setBotLevelId: vi.fn(),
      activeWorkspace: "coach",
      setActiveWorkspace,
      showAnalysisArrows: false,
      setShowAnalysisArrows: vi.fn(),
      boardTheme: "sunset",
      setBoardTheme: vi.fn(),
      privacyConsent: { ads: "unknown", updatedAt: null },
      setCompactUi: vi.fn(),
    },
    session: {
      isBotThinking: false,
      isBotGameStarted: false,
      lastMoveReview: null,
      selectedSquare: null,
      gameTermination: null,
      terminateBotGame: vi.fn(),
    },
    training: {
      task: { status: "idle" },
      stats: {},
      repetition: {},
      weeklyPlan: {},
      reset: vi.fn(),
      resetStats: vi.fn(),
      clearRepetition: vi.fn(),
    },
    review: { status: "idle", progress: null },
    onboarding: { status: "complete", resultDismissed: true },
    engine: {
      analysis: null,
      analyzedTurn: "w",
      isAnalyzing: false,
      error: "",
    },
    game: {
      instance: { turn: () => "w", isGameOver: () => false },
      displayedPosition: "",
      displayedLastMove: null,
      displayedCheckSquare: null,
      history: [],
      isViewingCurrentPosition: true,
    },
    derived: {
      showInitialBoard: true,
      boardOrientation: "white",
      legalMoveSquares: [],
      isMatchFinished: false,
      finalResultInfo: null,
      isActiveBotGame: false,
    },
    platform: { isNativeApp: false, showAdvertisingUi: false },
    access: { canUseMoveExplanations: false },
    rewardToast: null,
    resultCelebration: { visible: false, close: vi.fn() },
    botTurn: { error: null, retry: vi.fn() },
    actions: {
      handleSquareClick: vi.fn(),
      handlePieceDrop: vi.fn(),
      handleModeChange: vi.fn(),
      handlePlayerSideChange: vi.fn(),
      handleStartBotGame,
      handleNewGame: vi.fn(),
      handleUndoMove: vi.fn(),
      handleAnalyzePosition: vi.fn(),
      handleOpenResultReview: vi.fn(),
      handleResultNewGame: vi.fn(),
      handlePrivacyConsentChange: vi.fn(),
      handleStartDiagnostic: vi.fn(),
      handleSkipOnboarding: vi.fn(),
      handleOpenDiagnosticReview: vi.fn(),
      handleRestartDiagnostic: vi.fn(),
      handleDismissDiagnosticResult: vi.fn(),
      handleStartBestMoveTraining: vi.fn(),
      handleRevealBestMoveHint: vi.fn(),
      handleRetryBestMoveTraining: vi.fn(),
      handleContinueReviewTraining: vi.fn(),
      handleStartDueReviewTraining: vi.fn(),
    },
    ...overrides,
  } as unknown as ChessCoachController;

  return { controller, handleStartBotGame, setActiveWorkspace };
}

function render(controller: ChessCoachController) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  act(() => root.render(<ChessCoachView controller={controller} />));
  mounted.push({ container, root });

  return container;
}

afterEach(() => {
  for (const { container, root } of mounted.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
});

describe("ChessCoachView DOM contract", () => {
  it("монтирует основной экран и запускает игру за выбранную сторону", () => {
    const { controller, handleStartBotGame } = createController();
    const container = render(controller);
    const startButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Начать за белых");

    expect(container.querySelector("h1")?.textContent).toBe("Шахматный помощник");
    expect(startButton).toBeInstanceOf(HTMLButtonElement);

    act(() => startButton?.click());

    expect(handleStartBotGame).toHaveBeenCalledOnce();
  });

  it("передаёт смену рабочей области в контроллер", () => {
    const { controller, setActiveWorkspace } = createController();
    const container = render(controller);
    const gameWorkspaceButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Партия");

    expect(gameWorkspaceButton).toBeInstanceOf(HTMLButtonElement);

    act(() => gameWorkspaceButton?.click());

    expect(setActiveWorkspace).toHaveBeenCalledWith("game");
  });
});
