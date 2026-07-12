import { useState } from "react";
import "./FenPanel.css";

type Props = {
  fen: string;
  onImportFen: (fen: string) => boolean;
};

export default function FenPanel({
  fen,
  onImportFen,
}: Props) {
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");

  function handleCopyFen() {
    void navigator.clipboard
      .writeText(fen)
      .then(() => {
        setMessage("FEN скопирован в буфер обмена.");
      })
      .catch(() => {
        setMessage(
          "Не удалось скопировать автоматически. Выдели FEN вручную.",
        );
      });
  }

  function handleImportFen() {
    const success = onImportFen(importText);

    if (!success) {
      setMessage(
        "Не удалось импортировать FEN. Проверь строку позиции.",
      );
      return;
    }

    setImportText("");
    setMessage("FEN импортирован. Позиция загружена на доску.");
  }

  return (
    <div className="fen-card">
      <span className="status-label">FEN</span>

      <div className="fen-actions">
        <button type="button" onClick={handleCopyFen}>
          Скопировать FEN
        </button>
      </div>

      <textarea
        className="fen-output"
        value={fen}
        readOnly
      />

      <textarea
        className="fen-input"
        placeholder="Вставь FEN позиции сюда, чтобы загрузить её на доску"
        value={importText}
        onChange={(event) => {
          setImportText(event.target.value);
          setMessage("");
        }}
      />

      <button
        type="button"
        className="fen-import-button"
        onClick={handleImportFen}
        disabled={!importText.trim()}
      >
        Импортировать FEN
      </button>

      {message && <p className="fen-message">{message}</p>}
    </div>
  );
}
