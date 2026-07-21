import type { VerifiedChessFacts } from "./verifiedChessFacts";

export type CoachPriority = "attack" | "safety" | "development" | "material" | "position";

export type CoachPlan = {
  phase: string;
  priority: CoachPriority;
  headline: string;
  mainMove: string;
  evaluationText: string;
  firstSteps: string[];
  watchOut: string[];
  expectedLine: string;
  evidenceFactIds: string[];
};

const phaseLabels: Record<VerifiedChessFacts["position"]["phase"], string> = {
  opening: "Дебют",
  middlegame: "Миттельшпиль",
  endgame: "Эндшпиль",
};

function formatMove(move: string) {
  const promotion = move.slice(4);
  const route = `${move.slice(0, 2)} → ${move.slice(2, 4)}`;

  return promotion ? `${route}, превращение в ${promotion.toUpperCase()}` : route;
}

function formatVariation(variation: string[]) {
  if (variation.length === 0) {
    return "Вариант пока не рассчитан.";
  }

  return variation.slice(0, 6).map(formatMove).join(" • ");
}

function formatEvaluation(facts: VerifiedChessFacts) {
  const { evaluation, mate } = facts.recommendation;

  if (mate !== null) {
    return mate > 0
      ? `мат за ${Math.abs(mate)}`
      : `угроза мата за ${Math.abs(mate)}`;
  }

  if (evaluation === null) {
    return "оценка пока без точного числа";
  }

  const abs = Math.abs(evaluation);

  if (abs < 0.3) {
    return "примерно равная позиция";
  }

  if (abs < 1) {
    return evaluation > 0
      ? "небольшое преимущество стороны хода"
      : "позиция чуть хуже для стороны хода";
  }

  if (abs < 2) {
    return evaluation > 0
      ? "заметное преимущество стороны хода"
      : "стороне хода нужно играть точно";
  }

  return evaluation > 0
    ? "большой перевес стороны хода"
    : "позиция опасная, нужен точный защитный ход";
}

function getPriority(facts: VerifiedChessFacts): CoachPriority {
  const factIds = new Set(facts.facts.map((fact) => fact.id));

  if (factIds.has("motif.mate") || factIds.has("motif.check")) {
    return "attack";
  }

  if ((facts.recommendation.evaluation ?? 0) < -1) {
    return "safety";
  }

  if (factIds.has("motif.capture")) {
    return "material";
  }

  if (facts.position.phase === "opening") {
    return "development";
  }

  return "position";
}

function getHeadline(priority: CoachPriority) {
  if (priority === "attack") {
    return "Главное сейчас — создать прямую угрозу королю.";
  }

  if (priority === "safety") {
    return "Главное сейчас — не развалить позицию и найти точную защиту.";
  }

  if (priority === "material") {
    return "Главное сейчас — забрать материал без ухудшения позиции.";
  }

  if (priority === "development") {
    return "Главное сейчас — развить фигуры и укрепить центр.";
  }

  return "Главное сейчас — улучшить расположение фигур.";
}

function getWatchOut(facts: VerifiedChessFacts, priority: CoachPriority) {
  const side = facts.position.sideToMove === "white" ? "белых" : "чёрных";
  const warnings: string[] = [];

  if (facts.position.phase === "opening") {
    warnings.push("Не делай много ходов одной и той же фигурой без причины.");
    warnings.push("Не выводи ферзя рано, если нет конкретной тактики.");
  }

  if (priority === "safety") {
    warnings.push(`У ${side} позиция требует аккуратности: сначала проверь шахи, взятия и угрозы соперника.`);
  }

  warnings.push("После ответа соперника позицию нужно оценить заново.");

  return warnings.slice(0, 3);
}

export function buildCoachPlan(facts: VerifiedChessFacts): CoachPlan {
  const priority = getPriority(facts);
  const supportingFacts = facts.facts.filter((fact) =>
    fact.category === "motif" || fact.category === "move-effect"
  );
  const firstSteps = [
    `Сыграй ${formatMove(facts.recommendation.bestMove)}.`,
    ...supportingFacts.map((fact) => fact.text),
  ].filter((item, index, items) => items.indexOf(item) === index);
  const mainVariation = facts.variations.find((variation) => variation.rank === 1);

  return {
    phase: phaseLabels[facts.position.phase],
    priority,
    headline: getHeadline(priority),
    mainMove: formatMove(facts.recommendation.bestMove),
    evaluationText: formatEvaluation(facts),
    firstSteps: firstSteps.slice(0, 4),
    watchOut: getWatchOut(facts, priority),
    expectedLine: mainVariation
      ? formatVariation(mainVariation.moves.slice(1, 6))
      : "После хода соперника снова нажми анализ и оцени новую позицию.",
    evidenceFactIds: [
      "recommendation.best-move",
      ...supportingFacts.slice(0, 3).map((fact) => fact.id),
    ],
  };
}
