export type WorkspaceId = "coach" | "game" | "tools";

type WorkspaceTab = {
  id: WorkspaceId;
  title: string;
  shortTitle: string;
  icon: string;
  description: string;
};

const tabs: WorkspaceTab[] = [
  {
    id: "coach",
    title: "Учёба",
    shortTitle: "Учёба",
    icon: "♟",
    description: "План, лучший ход и тренировка.",
  },
  {
    id: "game",
    title: "Партия",
    shortTitle: "Партия",
    icon: "◷",
    description: "Итог, материал, оценка и разбор хода.",
  },
  {
    id: "tools",
    title: "Ещё",
    shortTitle: "Ещё",
    icon: "☰",
    description: "История, PGN/FEN, настройки и журнал.",
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
    <nav className="workspace-tabs-card" aria-label="Рабочая область">
      <span className="status-label workspace-tabs-label">
        Рабочая область
      </span>

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
            <span className="workspace-tab-icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="workspace-tab-title">{tab.title}</span>
            <span className="workspace-tab-short">{tab.shortTitle}</span>
          </button>
        ))}
      </div>

      <p className="workspace-tabs-description">
        {activeTab.description}
      </p>
    </nav>
  );
}
