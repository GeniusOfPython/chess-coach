import {
  toggleWorkspace,
  type WorkspaceId,
} from "../game/workspaceNavigation";
import type { KeyboardEvent } from "react";
import WorkspaceIcon, { type WorkspaceIconName } from "./WorkspaceIcon";

type WorkspaceTab = {
  id: WorkspaceId;
  title: string;
  shortTitle: string;
  icon: WorkspaceIconName;
  description: string;
};

const tabs: WorkspaceTab[] = [
  {
    id: "coach",
    title: "Учёба",
    shortTitle: "Учёба",
    icon: "study",
    description: "План, лучший ход и тренировка.",
  },
  {
    id: "game",
    title: "Партия",
    shortTitle: "Партия",
    icon: "game",
    description: "Итог, материал, оценка и разбор хода.",
  },
  {
    id: "tools",
    title: "Ещё",
    shortTitle: "Ещё",
    icon: "more",
    description: "История, PGN/FEN, настройки и журнал.",
  },
];

type Props = {
  active: WorkspaceId | null;
  onChange: (workspace: WorkspaceId | null) => void;
};

export default function WorkspaceTabs({
  active,
  onChange,
}: Props) {
  const activeTab = tabs.find((tab) => tab.id === active) ?? null;

  function scrollToWorkspace(workspace: WorkspaceId | null) {
    if (
      workspace === null ||
      !window.matchMedia("(max-width: 760px)").matches
    ) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById("workspace-content")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
  }

  function handleTabChange(workspace: WorkspaceId) {
    const nextWorkspace = toggleWorkspace(active, workspace);
    onChange(nextWorkspace);
    scrollToWorkspace(nextWorkspace);
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    onChange(nextTab.id);
    scrollToWorkspace(nextTab.id);

    const tabList = event.currentTarget.parentElement;
    const buttons = tabList?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    );
    buttons?.[nextIndex]?.focus();
  }

  return (
    <nav className="workspace-tabs-card" aria-label="Рабочая область">
      <span className="status-label workspace-tabs-label">
        Рабочая область
      </span>

      <div className="workspace-tabs" role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === active}
            aria-controls="workspace-content"
            tabIndex={tab.id === (active ?? tabs[0].id) ? 0 : -1}
            className={
              tab.id === active
                ? "workspace-tab active"
                : "workspace-tab"
            }
            onClick={() => handleTabChange(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            <span className="workspace-tab-icon" aria-hidden="true">
              <WorkspaceIcon name={tab.icon} />
            </span>
            <span className="workspace-tab-title">{tab.title}</span>
            <span className="workspace-tab-short">{tab.shortTitle}</span>
          </button>
        ))}
      </div>

      <p className="workspace-tabs-description">
        {activeTab?.description ?? "Выбери раздел, чтобы открыть рабочую область."}
      </p>
    </nav>
  );
}
