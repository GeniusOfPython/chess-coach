type Props = {
  label: string;
  rows?: number;
  compact?: boolean;
};

export default function LoadingSkeleton({
  label,
  rows = 3,
  compact = false,
}: Props) {
  return (
    <div
      className={compact ? "loading-skeleton compact" : "loading-skeleton"}
      role="status"
      aria-live="polite"
    >
      <div className="loading-skeleton-heading">
        <span className="loading-skeleton-orb" aria-hidden="true" />
        <strong>{label}</strong>
      </div>

      <div className="loading-skeleton-lines" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <span
            className="loading-skeleton-line"
            key={index}
            style={{ width: `${92 - index * 13}%` }}
          />
        ))}
      </div>
    </div>
  );
}
