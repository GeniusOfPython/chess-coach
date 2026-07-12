import type { ReactNode } from "react";
import "./CollapsibleSection.css";

type Props = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export default function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: Props) {
  return (
    <details
      className="collapsible-section"
      open={defaultOpen}
    >
      <summary className="collapsible-summary">
        <div className="collapsible-heading">
          <strong>{title}</strong>

          {description && (
            <span>{description}</span>
          )}
        </div>

        <span className="collapsible-chevron">⌄</span>
      </summary>

      <div className="collapsible-content">
        {children}
      </div>
    </details>
  );
}
