export type WorkspaceIconName = "study" | "game" | "more";

type Props = {
  name: WorkspaceIconName;
};

export default function WorkspaceIcon({ name }: Props) {
  const commonProps = {
    className: "workspace-icon",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    focusable: "false" as const,
    "aria-hidden": true,
  };

  if (name === "study") {
    return (
      <svg {...commonProps}>
        <path d="M4.5 5.5c2.8-.4 5 .2 7.5 2v11c-2.5-1.8-4.7-2.4-7.5-2V5.5Z" />
        <path d="M19.5 5.5c-2.8-.4-5 .2-7.5 2v11c2.5-1.8 4.7-2.4 7.5-2V5.5Z" />
        <path d="m17.2 2.7.35 1.05 1.05.35-1.05.35-.35 1.05-.35-1.05-1.05-.35 1.05-.35.35-1.05Z" />
      </svg>
    );
  }

  if (name === "game") {
    return (
      <svg {...commonProps}>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M12 4v16M4 12h16" />
        <path d="M12 4h5a3 3 0 0 1 3 3v5h-8V4ZM4 12h8v8H7a3 3 0 0 1-3-3v-5Z" fill="currentColor" stroke="none" opacity=".3" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M4 7h7M15 7h5M4 17h5M13 17h7" />
      <circle cx="13" cy="7" r="2" />
      <circle cx="11" cy="17" r="2" />
    </svg>
  );
}
