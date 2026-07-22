import { describe, expect, it } from "vitest";
import { createAiCoachUsageRepository } from "./aiCoachUsageRepository";
import { createAppPreferencesRepository } from "./appPreferencesRepository";
import { createChessAchievementsRepository } from "./chessAchievementsRepository";
import { createGameSessionRepository } from "./gameSessionRepository";
import { createInterfaceStateRepository } from "./interfaceStateRepository";
import {
  readJsonRepositoryValue,
  type RepositoryStorage,
} from "./repositoryStorage";
import { createTrainingProgressRepository } from "./trainingProgressRepository";
import { createSpacedRepetitionRepository } from "./spacedRepetitionRepository";
import { createOnboardingRepository } from "./onboardingRepository";
import { createEntitlementRepository } from "./entitlementRepository";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const storage: RepositoryStorage = {
    read: (key) => values.get(key) ?? null,
    write: (key, value) => values.set(key, value),
    remove: (key) => values.delete(key),
  };

  return { storage, values };
}

describe("repository storage", () => {
  it("удаляет повреждённый JSON через переданный порт", () => {
    const { storage, values } = createMemoryStorage({ broken: "{broken" });

    expect(readJsonRepositoryValue({ storage, key: "broken", fallback: [] }))
      .toEqual([]);
    expect(values.has("broken")).toBe(false);
  });
});

describe("app preferences repository", () => {
  it("восстанавливает типизированный снимок из старых ключей", () => {
    const { storage } = createMemoryStorage({
      "chess-coach.game-mode": "bot",
      "chess-coach.player-side": "b",
      "chess-coach.bot-level-id": "strong",
      "chess-coach.active-workspace": "tools",
      "chess-coach.compact-ui": "true",
      "chess-coach.show-analysis-arrows": "false",
      "chess-coach.board-theme": "cyber",
      "chess-coach.privacy-consent": JSON.stringify({
        ads: "declined",
        updatedAt: "2026-07-22T10:00:00.000Z",
      }),
    });

    expect(createAppPreferencesRepository(storage).load()).toEqual({
      gameMode: "bot",
      playerSide: "b",
      botLevelId: "strong",
      activeWorkspace: "tools",
      compactUi: true,
      showAnalysisArrows: false,
      boardTheme: "cyber",
      privacyConsent: {
        ads: "declined",
        updatedAt: "2026-07-22T10:00:00.000Z",
      },
    });
  });

  it("сохраняет null рабочего раздела в совместимом формате", () => {
    const { storage, values } = createMemoryStorage();
    const repository = createAppPreferencesRepository(storage);

    repository.save("activeWorkspace", null);
    repository.save("compactUi", true);

    expect(values.get("chess-coach.active-workspace")).toBe("none");
    expect(values.get("chess-coach.compact-ui")).toBe("true");
  });
});

describe("entitlement repository", () => {
  it("удаляет старые локальные записи, которые не могут быть источником доступа", () => {
    const { storage, values } = createMemoryStorage({
      "chess-coach.subscription-tier": "premium",
      "chess-coach.entitlement": JSON.stringify({
        version: 2,
        kind: "premium",
        source: "web",
        expiresAt: "2026-07-29T12:00:00.000Z",
        verifiedAt: "2026-07-22T12:00:00.000Z",
        verificationMode: "online",
        autoRenews: true,
      }),
      "chess-coach.board-theme": "sunset",
    });
    const repository = createEntitlementRepository(storage);

    repository.clearLegacyAccess();

    expect(values.has("chess-coach.subscription-tier")).toBe(false);
    expect(values.has("chess-coach.entitlement")).toBe(false);
    expect(values.get("chess-coach.board-theme")).toBe("sunset");
  });
});

describe("training progress repository", () => {
  it("обнуляет только дневной счётчик после смены даты", () => {
    const { storage } = createMemoryStorage({
      "chess-coach.training-best-streak": "8",
      "chess-coach.training-total-attempts": "30",
      "chess-coach.training-total-successes": "21",
      "chess-coach.training-daily-date": "2026-07-21",
      "chess-coach.training-daily-successes": "5",
    });

    expect(
      createTrainingProgressRepository(storage).load(
        new Date("2026-07-22T12:00:00.000Z"),
      ),
    ).toEqual({
      bestStreak: 8,
      totalAttempts: 30,
      totalSuccesses: 21,
      dailySuccesses: 0,
    });
  });
});

describe("onboarding repository", () => {
  it("restores a valid diagnostic and rejects an incomplete snapshot", () => {
    const valid = createMemoryStorage({
      "chess-coach.onboarding": JSON.stringify({
        version: 1,
        status: "diagnostic",
        goal: "reduce_mistakes",
        experience: "basic",
        startedAt: "2026-07-22T12:00:00.000Z",
      }),
    });
    const invalid = createMemoryStorage({
      "chess-coach.onboarding": JSON.stringify({
        version: 1,
        status: "diagnostic",
      }),
    });

    expect(createOnboardingRepository(valid.storage).load()).toMatchObject({
      status: "diagnostic",
      experience: "basic",
    });
    expect(createOnboardingRepository(invalid.storage).load()).toEqual({
      version: 1,
      status: "pending",
    });
  });
});

describe("spaced repetition repository", () => {
  it("keeps valid tasks and drops malformed queue entries", () => {
    const validItem = {
      id: "position-1",
      positionFen: "start",
      bestMove: "e2e4",
      moveNumber: 1,
      side: "w",
      playedMove: "d2d4",
      verdict: "mistake",
      evaluationBeforeWhite: 0.3,
      evaluationAfterWhite: -1,
      evaluationLoss: 1.3,
      theme: "calculation",
      attempts: 1,
      successes: 1,
      lapses: 0,
      intervalDays: 1,
      dueAt: "2026-07-23T12:00:00.000Z",
      lastReviewedAt: "2026-07-22T12:00:00.000Z",
      createdAt: "2026-07-22T12:00:00.000Z",
      updatedAt: "2026-07-22T12:00:00.000Z",
    };
    const { storage } = createMemoryStorage({
      "chess-coach.training-review-queue": JSON.stringify([
        validItem,
        { id: "broken" },
      ]),
    });

    expect(createSpacedRepetitionRepository(storage).load()).toEqual([{
      ...validItem,
      reviewHistory: [],
    }]);
  });
});

describe("game session repository", () => {
  it("читает партию и отбрасывает противоречивое завершение", () => {
    const { storage } = createMemoryStorage({
      "chess-coach.current-pgn": "1. e4 e5",
      "chess-coach.bot-game-started": "true",
      "chess-coach.game-termination": JSON.stringify({
        reason: "resignation",
        winner: "black",
        result: "1-0",
      }),
    });
    const repository = createGameSessionRepository(storage);

    expect(repository.loadCurrentPgn()).toBe("1. e4 e5");
    expect(repository.loadBotGameStarted()).toBe(true);
    expect(repository.loadTermination()).toBeNull();
  });
});

describe("achievements repository", () => {
  it("фильтрует неизвестные и повторяющиеся достижения", () => {
    const { storage } = createMemoryStorage({
      "chess-coach.chess-achievements": JSON.stringify([
        { id: "quick_mate", unlockedAt: "2026-07-22T10:00:00.000Z" },
        { id: "unknown", unlockedAt: "2026-07-22T10:00:00.000Z" },
        { id: "quick_mate", unlockedAt: "2026-07-22T11:00:00.000Z" },
      ]),
    });

    expect(createChessAchievementsRepository(storage).load()).toEqual([
      { id: "quick_mate", unlockedAt: "2026-07-22T10:00:00.000Z" },
    ]);
  });
});

describe("AI Coach usage repository", () => {
  it("записывает использование без зависимости от конкретной базы", () => {
    const { storage, values } = createMemoryStorage();
    const repository = createAiCoachUsageRepository(storage);
    const now = new Date("2026-07-22T12:00:00.000Z");

    expect(repository.record({ period: "day", limit: 3 }, now)).toEqual({
      periodKey: "2026-07-22",
      count: 1,
    });
    expect(JSON.parse(values.get("chess-coach.ai-coach-usage") ?? ""))
      .toEqual({ periodKey: "2026-07-22", count: 1 });
  });
});

describe("interface state repository", () => {
  it("сам формирует физический ключ секции", () => {
    const { storage, values } = createMemoryStorage();
    const repository = createInterfaceStateRepository(storage);

    repository.saveSectionOpen("settings", true);

    expect(values.get("chess-coach.section.settings")).toBe("open");
    expect(repository.loadSectionOpen("settings", false)).toBe(true);
  });
});
