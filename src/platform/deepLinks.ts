import type { WorkspaceId } from "../game/workspaceNavigation";

export type DeepLinkTarget = {
  workspace: WorkspaceId;
  moveIndex?: number;
};

const workspaceIds = new Set<WorkspaceId>(["coach", "game", "tools"]);
const fallbackBaseUrl = "https://chess-coach.invalid";

function getWorkspace(value: string | null): WorkspaceId | null {
  return value && workspaceIds.has(value as WorkspaceId)
    ? value as WorkspaceId
    : null;
}

function getMoveIndex(value: string | null) {
  if (!value || !/^\d+$/u.test(value)) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function getRequestedMoveIndex(url: URL) {
  return getMoveIndex(url.searchParams.get("move")) ??
    getMoveIndex(url.searchParams.get("position"));
}

function withMoveIndex(workspace: WorkspaceId, moveIndex: number | undefined) {
  return moveIndex === undefined ? { workspace } : { workspace, moveIndex };
}

function getCustomSchemeTarget(url: URL): DeepLinkTarget | null {
  if (url.hostname === "workspace") {
    const workspace = getWorkspace(url.pathname.split("/").at(1) ?? null);
    return workspace ? { workspace } : null;
  }

  if (url.hostname === "review") {
    return withMoveIndex("game", getRequestedMoveIndex(url));
  }

  if (url.hostname === "training") {
    return { workspace: "coach" };
  }

  return url.hostname === "tools" ? { workspace: "tools" } : null;
}

/**
 * Accepts native URLs and PWA links.
 *
 * Native: chesscoach://workspace/game, chesscoach://review?move=12
 * Web:    https://host/?workspace=coach or ?workspace=game&move=12
 */
export function parseDeepLink(rawUrl: string): DeepLinkTarget | null {
  let url: URL;

  try {
    url = new URL(rawUrl, fallbackBaseUrl);
  } catch {
    return null;
  }

  if (url.protocol === "chesscoach:") {
    return getCustomSchemeTarget(url);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  const workspace = getWorkspace(url.searchParams.get("workspace"));
  return workspace ? withMoveIndex(workspace, getRequestedMoveIndex(url)) : null;
}
