import "./BotFairPlayNotice.css";

export default function BotFairPlayNotice() {
  return (
    <div className="bot-fair-play-notice">
      <span className="status-label">Честная партия</span>
      <strong>Подсказки отключены до завершения игры</strong>
      <p>
        Подсказки и оценка отдельных решений отключены во
        время партии против бота. После результата открой вкладку «Партия» и
        запусти полный обзор ходов.
      </p>
    </div>
  );
}
