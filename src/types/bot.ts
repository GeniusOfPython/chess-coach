export type BotLevelId =
  | "beginner"
  | "casual"
  | "club"
  | "strong"
  | "max";

export type BotLevel = {
  id: BotLevelId;
  title: string;
  description: string;
  movetime: number;
  multiPv: number;
  randomLegalMoveChance: number;
  secondLineChance: number;
  thirdLineChance: number;
};

export const BOT_LEVELS: BotLevel[] = [
  {
    id: "beginner",
    title: "Новичок",
    description:
      "Часто выбирает не лучший ход и иногда делает случайные ходы.",
    movetime: 180,
    multiPv: 3,
    randomLegalMoveChance: 0.24,
    secondLineChance: 0.32,
    thirdLineChance: 0.24,
  },
  {
    id: "casual",
    title: "Любитель",
    description:
      "В целом играет разумно, но периодически выбирает не самый точный вариант.",
    movetime: 500,
    multiPv: 3,
    randomLegalMoveChance: 0.08,
    secondLineChance: 0.24,
    thirdLineChance: 0.12,
  },
  {
    id: "club",
    title: "Клубный",
    description:
      "Играет крепко, но иногда отклоняется от первого варианта Stockfish.",
    movetime: 1100,
    multiPv: 2,
    randomLegalMoveChance: 0.02,
    secondLineChance: 0.12,
    thirdLineChance: 0,
  },
  {
    id: "strong",
    title: "Сильный",
    description:
      "Почти всегда выбирает лучший ход и считает глубже.",
    movetime: 2200,
    multiPv: 2,
    randomLegalMoveChance: 0,
    secondLineChance: 0.04,
    thirdLineChance: 0,
  },
  {
    id: "max",
    title: "Максимум",
    description: "Самый сильный режим на текущей сборке.",
    movetime: 4000,
    multiPv: 1,
    randomLegalMoveChance: 0,
    secondLineChance: 0,
    thirdLineChance: 0,
  },
];

export function getBotLevel(id: BotLevelId) {
  return (
    BOT_LEVELS.find((level) => level.id === id) ??
    BOT_LEVELS[1]
  );
}
