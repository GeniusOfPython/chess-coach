import {
  localRepositoryStorage,
  type RepositoryStorage,
} from "./repositoryStorage";

export type CollapsibleSectionId =
  | "game-setup"
  | "achievements"
  | "opening"
  | "learning-journal"
  | "history"
  | "game-archive"
  | "position-tools"
  | "settings";

function sectionKey(sectionId: CollapsibleSectionId) {
  return `chess-coach.section.${sectionId}`;
}

export function createInterfaceStateRepository(
  storage: RepositoryStorage = localRepositoryStorage,
) {
  return {
    loadSectionOpen(sectionId: CollapsibleSectionId, fallback: boolean) {
      const value = storage.read(sectionKey(sectionId));

      return value === "open" ? true : value === "closed" ? false : fallback;
    },

    saveSectionOpen(sectionId: CollapsibleSectionId, isOpen: boolean) {
      storage.write(sectionKey(sectionId), isOpen ? "open" : "closed");
    },
  };
}

export const interfaceStateRepository = createInterfaceStateRepository();
