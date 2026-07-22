import {
  type ReactNode,
  useEffect,
  useState,
} from "react";
import {
  interfaceStateRepository,
  type CollapsibleSectionId,
} from "../repositories/interfaceStateRepository";
import "./CollapsibleSection.css";

type Props = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  persistenceId?: CollapsibleSectionId;
  children: ReactNode;
};

function readStoredOpenState(
  persistenceId: CollapsibleSectionId | undefined,
  defaultOpen: boolean,
) {
  if (!persistenceId) {
    return defaultOpen;
  }

  return interfaceStateRepository.loadSectionOpen(persistenceId, defaultOpen);
}

export default function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  persistenceId,
  children,
}: Props) {
  const [isOpen, setIsOpen] = useState(() =>
    readStoredOpenState(persistenceId, defaultOpen),
  );

  useEffect(() => {
    if (!persistenceId) {
      return;
    }

    interfaceStateRepository.saveSectionOpen(persistenceId, isOpen);
  }, [isOpen, persistenceId]);

  return (
    <details
      className="collapsible-section"
      open={isOpen}
      onToggle={(event) => {
        setIsOpen(event.currentTarget.open);
      }}
    >
      <summary className="collapsible-summary">
        <div className="collapsible-heading">
          <strong>{title}</strong>

          {description && <span>{description}</span>}
        </div>

        <span className="collapsible-chevron">⌄</span>
      </summary>

      <div className="collapsible-content">
        {children}
      </div>
    </details>
  );
}
