export type WorkspaceId = "coach" | "game" | "tools";

type WorkspaceTab = {
  id: WorkspaceId;
  title: string;
  description: string;
};

const tabs: WorkspaceTab[] = [
  {
    id: "coach",
    title: "Учёба",
    description: "Главный экран: план, лучший ход и тренировка.",
  },
  {
    id: "game",
    title: "Партия",
    description: "Итог, материал, оценка и разбор последнего хода.",
  },
  {
    id: "tools",
    title: "Ещё",
    description: "История, PGN/FEN, настройки и журнал ошибок.",
  },
];

type Props = {
  active: WorkspaceId;
  onChange: (workspace: WorkspaceId) => void;
};

export default function WorkspaceTabs({
  active,
  onChange,
}: Props) {
  const activeTab =
    tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <div className="workspace-tabs-card">
      <span className="status-label">Рабочая область</span>

      <div className="workspace-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === active}
            className={
              tab.id === active
                ? "workspace-tab active"
                : "workspace-tab"
            }
            onClick={() => onChange(tab.id)}
          >
            {tab.title}
          </button>
        ))}
      </div>

      <p className="workspace-tabs-description">
        {activeTab.description}
      </p>
    </div>
  );
}
