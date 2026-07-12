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
};

export const BOT_LEVELS: BotLevel[] = [
  {
    id: "beginner",
    title: "Новичок",
    description: "Быстрые и не всегда точные ответы.",
    movetime: 250,
  },
  {
    id: "casual",
    title: "Любитель",
    description: "Играет разумно, но без глубокого расчёта.",
    movetime: 600,
  },
  {
    id: "club",
    title: "Клубный",
    description: "Считает глубже и реже ошибается.",
    movetime: 1200,
  },
  {
    id: "strong",
    title: "Сильный",
    description: "Ищет хорошие позиционные и тактические решения.",
    movetime: 2200,
  },
  {
    id: "max",
    title: "Максимум",
    description: "Самый сильный режим на текущей сборке.",
    movetime: 4000,
  },
];

export function getBotLevel(id: BotLevelId) {
  return (
    BOT_LEVELS.find((level) => level.id === id) ??
    BOT_LEVELS[1]
  );
}
