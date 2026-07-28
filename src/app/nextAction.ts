export type NextAction = {
  label: string;
  description: string;
  kind:
    | "start_game"
    | "open_training"
    | "review_game"
    | "fix_mistake"
    | "review_due";
};

export function getNextAction({
  activeBotGame,
  botGameStarted,
  dueReviewCount,
  gameMode,
  hasReviewableMoves,
  playerSide,
  reviewCompleted,
  reviewHasMistakes,
  trainingReady,
}: {
  activeBotGame: boolean;
  botGameStarted: boolean;
  dueReviewCount: number;
  gameMode: "analysis" | "bot";
  hasReviewableMoves: boolean;
  playerSide: "w" | "b";
  reviewCompleted: boolean;
  reviewHasMistakes: boolean;
  trainingReady: boolean;
}): NextAction | null {
  if (activeBotGame) {
    return null;
  }

  if (trainingReady) {
    return {
      kind: "open_training",
      label: "Вернуться к задаче",
      description: "Позиция уже подготовлена. Найди сильнейшее продолжение без подсказки.",
    };
  }

  if (reviewCompleted && reviewHasMistakes) {
    return {
      kind: "fix_mistake",
      label: "Исправить главную ошибку",
      description: "Вернись к ключевой позиции и найди более сильный ход самостоятельно.",
    };
  }

  if (dueReviewCount > 0) {
    return {
      kind: "review_due",
      label: `Повторить ${dueReviewCount} ${getPositionWord(dueReviewCount)}`,
      description: "Ошибки уже доступны по расписанию. Реши их без подсказок, чтобы продвинуть недельный план.",
    };
  }

  if (hasReviewableMoves && !reviewCompleted) {
    return {
      kind: "review_game",
      label: "Разобрать партию",
      description: "Найди 1–3 момента, которые сильнее всего повлияли на результат.",
    };
  }

  if (gameMode === "bot" && !botGameStarted) {
    return {
      kind: "start_game",
      label: `Начать за ${playerSide === "w" ? "белых" : "чёрных"}`,
      description: "Сыграй тренировочную партию — после неё тренер выделит главный момент для роста.",
    };
  }

  return null;
}

function getPositionWord(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "позиций";
  }

  if (lastDigit === 1) {
    return "позицию";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "позиции";
  }

  return "позиций";
}
