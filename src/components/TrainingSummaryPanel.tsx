import type { LearningJournalItem } from "./LearningJournalPanel";

type Props = {
  historyLength: number;
  items: LearningJournalItem[];
};

function countByVerdict(
  items: LearningJournalItem[],
  verdict: LearningJournalItem["verdict"],
) {
  return items.filter((item) => item.verdict === verdict).length;
}

function getApproxAccuracy({
  historyLength,
  mistakesCount,
}: {
  historyLength: number;
  mistakesCount: number;
}) {
  if (historyLength === 0) {
    return null;
  }

  const ratio = Math.max(
    0,
    1 - mistakesCount / Math.max(1, historyLength),
  );

  return Math.round(ratio * 100);
}

export default function TrainingSummaryPanel({
  historyLength,
  items,
}: Props) {
  const inaccuracies = countByVerdict(items, "inaccuracy");
  const mistakes = countByVerdict(items, "mistake");
  const blunders = countByVerdict(items, "blunder");
  const totalErrors = items.length;
  const approximateAccuracy = getApproxAccuracy({
    historyLength,
    mistakesCount: totalErrors,
  });

  return (
    <div className="training-summary-card">
      <span className="status-label">Сводка обучения</span>

      <div className="training-summary-grid">
        <div>
          <strong>{historyLength}</strong>
          <span>ходов</span>
        </div>

        <div>
          <strong>{totalErrors}</strong>
          <span>ошибок в журнале</span>
        </div>

        <div>
          <strong>
            {approximateAccuracy === null
              ? "—"
              : `${approximateAccuracy}%`}
          </strong>
          <span>примерная точность</span>
        </div>
      </div>

      <div className="training-summary-errors">
        <span>Неточности: {inaccuracies}</span>
        <span>Ошибки: {mistakes}</span>
        <span>Грубые: {blunders}</span>
      </div>

      <p>
        Точность пока считается приблизительно: по числу ходов,
        попавших в журнал ошибок. Позже можно заменить это на
        полноценный анализ всей партии.
      </p>
    </div>
  );
}
