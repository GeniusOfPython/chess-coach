import type { NextAction } from "../app/nextAction";

type Props = {
  action: NextAction | null;
  onAction: () => void;
};

export default function NextActionCard({ action, onAction }: Props) {
  if (!action) {
    return null;
  }

  return (
    <section className="next-action-card" aria-label="Следующее действие">
      <span className="status-label">Следующий шаг</span>
      <strong>{action.label}</strong>
      <p>{action.description}</p>
      <button type="button" onClick={onAction}>
        {action.label}
      </button>
    </section>
  );
}
