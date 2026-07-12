type Props = {
  history: string[];
};

export default function MoveHistory({ history }: Props) {
  return (
    <div className="history-card">
      <h2>История ходов</h2>

      {history.length === 0 ? (
        <p className="empty">Ходов пока нет</p>
      ) : (
        <ol className="moves">
          {Array.from(
            { length: Math.ceil(history.length / 2) },
            (_, index) => {
              const whiteMove = history[index * 2];
              const blackMove = history[index * 2 + 1];

              return (
                <li key={index}>
                  <span>{whiteMove}</span>
                  <span>{blackMove ?? "—"}</span>
                </li>
              );
            },
          )}
        </ol>
      )}
    </div>
  );
}