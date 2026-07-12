export type RewardToastKind =
  | "success"
  | "warning"
  | "info";

export type RewardToastMessage = {
  id: number;
  kind: RewardToastKind;
  title: string;
  text: string;
};

type Props = {
  message: RewardToastMessage | null;
};

export default function RewardToast({ message }: Props) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`reward-toast ${message.kind}`}
      role="status"
      aria-live="polite"
      key={message.id}
    >
      <div className="reward-toast-icon">
        {message.kind === "success"
          ? "✓"
          : message.kind === "warning"
            ? "!"
            : "i"}
      </div>

      <div className="reward-toast-content">
        <strong>{message.title}</strong>
        <span>{message.text}</span>
      </div>
    </div>
  );
}
