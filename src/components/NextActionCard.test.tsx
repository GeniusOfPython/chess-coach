import { describe, expect, it } from "vitest";
import { getNextAction } from "../app/nextAction";

const defaults = {
  activeBotGame: false,
  botGameStarted: false,
  dueReviewCount: 0,
  gameMode: "bot" as const,
  hasReviewableMoves: false,
  playerSide: "w" as const,
  reviewCompleted: false,
  reviewHasMistakes: false,
  trainingReady: false,
};

describe("getNextAction", () => {
  it("не предлагает подсказок во время активной партии с ботом", () => {
    expect(getNextAction({
      ...defaults,
      activeBotGame: true,
      trainingReady: true,
      reviewCompleted: true,
      reviewHasMistakes: true,
    })).toBeNull();
  });

  it("сначала возвращает пользователя к незавершённой задаче", () => {
    expect(getNextAction({
      ...defaults,
      trainingReady: true,
      reviewCompleted: true,
      reviewHasMistakes: true,
    })).toMatchObject({ kind: "open_training" });
  });

  it("после разбора ведёт к исправлению главной ошибки", () => {
    expect(getNextAction({
      ...defaults,
      reviewCompleted: true,
      reviewHasMistakes: true,
    })).toMatchObject({ kind: "fix_mistake" });
  });

  it("предлагает повторить ошибки, доступные по расписанию", () => {
    expect(getNextAction({
      ...defaults,
      dueReviewCount: 3,
    })).toMatchObject({
      kind: "review_due",
      label: "Повторить 3 позиции",
    });
  });

  it("не перебивает свежую главную ошибку повторением по расписанию", () => {
    expect(getNextAction({
      ...defaults,
      dueReviewCount: 2,
      reviewCompleted: true,
      reviewHasMistakes: true,
    })).toMatchObject({ kind: "fix_mistake" });
  });

  it("согласует форму слова в кнопке повтора", () => {
    expect(getNextAction({
      ...defaults,
      dueReviewCount: 1,
    })?.label).toBe("Повторить 1 позицию");
    expect(getNextAction({
      ...defaults,
      dueReviewCount: 5,
    })?.label).toBe("Повторить 5 позиций");
  });

  it("предлагает разбор, когда накопилось достаточно ходов", () => {
    expect(getNextAction({
      ...defaults,
      hasReviewableMoves: true,
    })).toMatchObject({ kind: "review_game" });
  });

  it("предлагает явно начать партию, когда учебных данных ещё нет", () => {
    expect(getNextAction(defaults)).toMatchObject({
      kind: "start_game",
      label: "Начать за белых",
    });
  });
});
