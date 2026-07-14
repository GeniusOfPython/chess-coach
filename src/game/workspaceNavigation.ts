import type { WorkspaceId } from "../components/WorkspaceTabs";

export function toggleWorkspace(
  active: WorkspaceId | null,
  selected: WorkspaceId,
): WorkspaceId | null {
  return active === selected ? null : selected;
}
