import { useRef, useState, type ChangeEvent } from "react";
import {
  createAppBackupJson,
  restoreAppBackup,
} from "../platform/appBackup";
import "./DataBackupPanel.css";

type ImportStatus = {
  kind: "success" | "error";
  message: string;
} | null;

function createBackupFileName() {
  return `chess-coach-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

export default function DataBackupPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus>(null);

  const handleExport = () => {
    const backupBlob = new Blob([createAppBackupJson()], {
      type: "application/json;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(backupBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = createBackupFileName();
    link.click();
    URL.revokeObjectURL(downloadUrl);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      restoreAppBackup(await file.text());
      setImportStatus({
        kind: "success",
        message: "Копия восстановлена. Обновляем данные…",
      });
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setImportStatus({
        kind: "error",
        message: error instanceof Error
          ? error.message
          : "Не удалось восстановить резервную копию",
      });
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="setting-row data-backup-row">
      <div>
        <strong>Резервная копия</strong>
        <p>
          Сохраняет текущую партию, настройки и учебный прогресс в один
          резервный файл.
        </p>

        {importStatus && (
          <span className={`data-backup-status ${importStatus.kind}`}>
            {importStatus.message}
          </span>
        )}
      </div>

      <div className="data-backup-actions">
        <button type="button" className="secondary" onClick={handleExport}>
          Скачать копию
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          Восстановить
        </button>
        <input
          ref={fileInputRef}
          className="data-backup-input"
          type="file"
          accept="application/json,.json"
          onChange={(event) => void handleImport(event)}
        />
      </div>
    </div>
  );
}
