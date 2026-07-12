import { useState } from "react";
import "./PgnPanel.css";

type Props = {
  pgn: string;
  onImportPgn: (pgn: string) => boolean;
};

export default function PgnPanel({
  pgn,
  onImportPgn,
}: Props) {
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");

  function handleCopyPgn() {
    if (!pgn.trim()) {
      setMessage("PGN пока пустой: в партии нет ходов.");
      return;
    }

    void navigator.clipboard
      .writeText(pgn)
      .then(() => {
        setMessage("PGN скопирован в буфер обмена.");
      })
      .catch(() => {
        setMessage(
          "Не удалось скопировать автоматически. Выдели PGN вручную.",
        );
      });
  }

  function handleDownloadPgn() {
    if (!pgn.trim()) {
      setMessage("PGN пока пустой: в партии нет ходов.");
      return;
    }

    const blob = new Blob([pgn], {
      type: "application/x-chess-pgn;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "chess-game.pgn";
    link.click();

    URL.revokeObjectURL(url);
    setMessage("PGN-файл скачан.");
  }

  function handleImportPgn() {
    const success = onImportPgn(importText);

    if (!success) {
      setMessage(
        "Не удалось импортировать PGN. Проверь текст партии.",
      );
      return;
    }

    setImportText("");
    setMessage("PGN импортирован. Партия загружена на доску.");
  }

  return (
    <div className="pgn-card">
      <span className="status-label">PGN</span>

      <div className="pgn-actions">
        <button type="button" onClick={handleCopyPgn}>
          Скопировать PGN
        </button>

        <button type="button" onClick={handleDownloadPgn}>
          Скачать PGN
        </button>
      </div>

      <textarea
        className="pgn-output"
        value={pgn || "PGN появится здесь после ходов."}
        readOnly
      />

      <textarea
        className="pgn-input"
        placeholder="Вставь PGN партии сюда, чтобы загрузить её на доску"
        value={importText}
        onChange={(event) => {
          setImportText(event.target.value);
          setMessage("");
        }}
      />

      <button
        type="button"
        className="pgn-import-button"
        onClick={handleImportPgn}
        disabled={!importText.trim()}
      >
        Импортировать PGN
      </button>

      {message && <p className="pgn-message">{message}</p>}
    </div>
  );
}
