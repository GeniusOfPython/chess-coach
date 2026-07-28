import type { AiCoachReflectionEntry } from "../repositories/aiCoachReflectionRepository";

type Props = {
  entries: AiCoachReflectionEntry[];
  onRemove: (key: string) => void;
  onClear: () => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPracticeLabel(entry: AiCoachReflectionEntry) {
  if (!entry.practice) {
    return "Мысль сохранена";
  }

  return entry.practice.outcome === "verified"
    ? "Проверено: совпало с расчётом"
    : "Проверка не подтверждена";
}

export default function AiReflectionJournalPanel({
  entries,
  onRemove,
  onClear,
}: Props) {
  if (entries.length === 0) {
    return (
      <div className="ai-reflection-journal empty">
        <p>
          Здесь появятся сохранённые мысли из ИИ-разборов и результаты их
          проверки на доске.
        </p>
      </div>
    );
  }

  return (
    <section className="ai-reflection-journal" aria-label="Журнал мыслей ИИ-разбора">
      <div className="ai-reflection-journal-heading">
        <div>
          <span>Локально на устройстве</span>
          <strong>{entries.length} сохранённых {entries.length === 1 ? "мысль" : "мыслей"}</strong>
        </div>
        <button type="button" onClick={onClear}>Очистить всё</button>
      </div>

      <div className="ai-reflection-journal-list">
        {entries.map((entry) => (
          <article className="ai-reflection-journal-entry" key={entry.key}>
            <div className="ai-reflection-journal-meta">
              <span className={entry.practice?.outcome ?? "saved"}>
                {getPracticeLabel(entry)}
              </span>
              <time dateTime={entry.updatedAt}>{formatDate(entry.updatedAt)}</time>
            </div>
            {entry.question && <p className="ai-reflection-journal-question">Вопрос: {entry.question}</p>}
            <p className="ai-reflection-journal-answer">{entry.answer}</p>
            <button type="button" onClick={() => onRemove(entry.key)}>
              Удалить
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
