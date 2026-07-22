import {
  getDueRepetitionItems,
  getSpacedRepetitionSummary,
  type SpacedRepetitionItem,
} from "./spacedRepetition";

export type WeeklyTrainingPlan = {
  weekStartsAt: string;
  weekEndsAt: string;
  target: number;
  completed: number;
  progress: number;
  focusThemeLabel: string | null;
  status: "empty" | "active" | "complete";
  nextAction: string;
};

function startOfUtcWeek(now: Date) {
  const start = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  ));
  const dayFromMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - dayFromMonday);
  return start;
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function buildWeeklyTrainingPlan(
  items: SpacedRepetitionItem[],
  now = new Date(),
): WeeklyTrainingPlan {
  const weekStart = startOfUtcWeek(now);
  const weekEnd = addUtcDays(weekStart, 7);
  const weekStartsAt = weekStart.toISOString();
  const weekEndsAt = weekEnd.toISOString();
  const target = Math.min(15, items.length);
  const completed = Math.min(
    target,
    items.reduce((total, item) => total + (item.reviewHistory ?? []).filter(
      ({ reviewedAt, independent }) => independent &&
        reviewedAt >= weekStartsAt && reviewedAt < weekEndsAt,
    ).length, 0),
  );
  const progress = target === 0 ? 0 : Math.round((completed / target) * 100);
  const summary = getSpacedRepetitionSummary(items, now.toISOString());
  const due = getDueRepetitionItems(
    items,
    now.toISOString(),
    Number.POSITIVE_INFINITY,
  ).length;

  if (target === 0) {
    return {
      weekStartsAt,
      weekEndsAt,
      target,
      completed,
      progress,
      focusThemeLabel: null,
      status: "empty",
      nextAction: "Разбери партию, чтобы сформировать первый недельный план.",
    };
  }

  const status = completed >= target ? "complete" : "active";
  const nextAction = status === "complete"
    ? "План недели выполнен. Новые ошибки добавятся после следующего разбора."
    : due > 0
      ? `Сегодня к повторению: ${due}. Решай без подсказок, чтобы закрыть план.`
      : "На сегодня повторений нет. Следующая позиция откроется по расписанию.";

  return {
    weekStartsAt,
    weekEndsAt,
    target,
    completed,
    progress,
    focusThemeLabel: summary.weakThemeLabel,
    status,
    nextAction,
  };
}
