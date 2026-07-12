type Props = {
  compactUi: boolean;
  showAnalysisArrows: boolean;
  onCompactUiChange: (enabled: boolean) => void;
  onShowAnalysisArrowsChange: (enabled: boolean) => void;
};

export default function AppSettingsPanel({
  compactUi,
  showAnalysisArrows,
  onCompactUiChange,
  onShowAnalysisArrowsChange,
}: Props) {
  return (
    <div className="app-settings-card">
      <div className="setting-row">
        <div>
          <strong>Компактный интерфейс</strong>
          <p>
            Уменьшает отступы и высоту карточек. Удобно для телефона
            и небольшого экрана.
          </p>
        </div>

        <label className="setting-switch">
          <input
            type="checkbox"
            checked={compactUi}
            onChange={(event) =>
              onCompactUiChange(event.target.checked)
            }
          />
          <span />
        </label>
      </div>

      <div className="setting-row">
        <div>
          <strong>Стрелки анализа</strong>
          <p>
            Показывает лучший ход и альтернативы стрелками на доске.
            Можно отключить, если они мешают думать самому.
          </p>
        </div>

        <label className="setting-switch">
          <input
            type="checkbox"
            checked={showAnalysisArrows}
            onChange={(event) =>
              onShowAnalysisArrowsChange(event.target.checked)
            }
          />
          <span />
        </label>
      </div>
    </div>
  );
}
