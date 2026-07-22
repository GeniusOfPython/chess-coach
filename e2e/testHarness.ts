import type { Page } from "@playwright/test";

type DeterministicAppStateOptions = {
  activeWorkspace?: "coach" | "game" | "tools" | "none";
  onboarding?: "complete" | "pending";
  storageEntries?: Record<string, string>;
  indexedDb?: "available" | "unavailable";
};

export async function installDeterministicAppState(
  page: Page,
  {
    activeWorkspace = "coach",
    onboarding = "complete",
    storageEntries = {},
    indexedDb = "available",
  }: DeterministicAppStateOptions = {},
) {
  await page.addInitScript(({ workspace, onboardingState, entries, indexedDbState }) => {
    const installationMarker = "chess-coach.e2e-state-installed";

    if (window.sessionStorage.getItem(installationMarker) !== "true") {
      window.sessionStorage.setItem(installationMarker, "true");
      window.localStorage.clear();
      window.localStorage.setItem("chess-coach.active-workspace", workspace);
      window.localStorage.setItem("chess-coach.subscription-tier", "premium");
      window.localStorage.setItem("chess-coach.board-theme", "sunset");
      window.localStorage.setItem("chess-coach.show-analysis-arrows", "true");

      if (onboardingState === "complete") {
        window.localStorage.setItem("chess-coach.onboarding", JSON.stringify({
          version: 1,
          status: "skipped",
        }));
      }

      Object.entries(entries).forEach(([key, value]) => {
        window.localStorage.setItem(key, value);
      });
    }

    if (indexedDbState === "unavailable") {
      Object.defineProperty(window, "indexedDB", {
        configurable: true,
        value: undefined,
      });
    }

    class DeterministicWorker {
      onmessage: ((event: MessageEvent<string>) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      private fen = "";

      postMessage(command: string) {
        if (command === "uci") {
          queueMicrotask(() => this.emit("uciok"));
          return;
        }

        if (command === "isready") {
          queueMicrotask(() => this.emit("readyok"));
          return;
        }

        if (command.startsWith("position fen ")) {
          this.fen = command.slice("position fen ".length);
          return;
        }

        if (command.startsWith("go ")) {
          const isInitialPosition = this.fen.startsWith(
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
          );
          const isBlackToMove = this.fen.includes(" b ");
          const bestMove = isInitialPosition
            ? "d2d4"
            : isBlackToMove
              ? "e7e5"
              : "g1f3";
          const score = isBlackToMove ? 150 : 0;

          queueMicrotask(() => {
            this.emit(
              `info depth 16 multipv 1 score cp ${score} pv ${bestMove}`,
            );
            this.emit(`bestmove ${bestMove}`);
          });
        }
      }

      terminate() {}

      addEventListener() {}

      removeEventListener() {}

      dispatchEvent() {
        return true;
      }

      private emit(data: string) {
        this.onmessage?.(new MessageEvent("message", { data }));
      }
    }

    Object.defineProperty(window, "Worker", {
      configurable: true,
      writable: true,
      value: DeterministicWorker,
    });
  }, {
    workspace: activeWorkspace,
    onboardingState: onboarding,
    entries: storageEntries,
    indexedDbState: indexedDb,
  });
}

export async function waitForStableInterface(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
}
