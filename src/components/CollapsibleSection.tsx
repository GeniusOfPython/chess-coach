import {
  type ReactNode,
  useEffect,
  useState,
} from "react";
import {
  readStorageValue,
  writeStorageValue,
} from "../platform/appStorage";
import "./CollapsibleSection.css";

type Props = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  storageKey?: string;
  children: ReactNode;
};

function readStoredOpenState(
  storageKey: string | undefined,
  defaultOpen: boolean,
) {
  if (!storageKey) {
    return defaultOpen;
  }

  const value = readStorageValue(storageKey);

  if (value === "open") {
    return true;
  }

  if (value === "closed") {
    return false;
  }

  return defaultOpen;
}

export default function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  storageKey,
  children,
}: Props) {
  const [isOpen, setIsOpen] = useState(() =>
    readStoredOpenState(storageKey, defaultOpen),
  );

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    writeStorageValue(storageKey, isOpen ? "open" : "closed");
  }, [isOpen, storageKey]);

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
