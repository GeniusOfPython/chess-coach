import type { Page } from "@playwright/test";

type DeterministicAppStateOptions = {
  activeWorkspace?: "coach" | "game" | "tools" | "none";
  onboarding?: "complete" | "pending";
  entitlement?: "premium" | "free" | "expired" | "offline" | "stale";
  nativePlatform?: "web" | "android" | "ios";
  storageEntries?: Record<string, string>;
  indexedDb?: "available" | "unavailable";
};

export async function installDeterministicAppState(
  page: Page,
  {
    activeWorkspace = "coach",
    onboarding = "complete",
    entitlement = "premium",
    nativePlatform = "web",
    storageEntries = {},
    indexedDb = "available",
  }: DeterministicAppStateOptions = {},
) {
  await page.addInitScript(({
    workspace,
    onboardingState,
    entitlementState,
    entries,
    indexedDbState,
    platform,
  }) => {
    const installationMarker = "chess-coach.e2e-state-installed";

    if (window.sessionStorage.getItem(installationMarker) !== "true") {
      window.sessionStorage.setItem(installationMarker, "true");
      window.localStorage.clear();
      window.localStorage.setItem("chess-coach.active-workspace", workspace);
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

    const now = Date.now();
    const entitlementValue = entitlementState === "free"
      ? {
          version: 2,
          kind: "free",
          source: "none",
          expiresAt: null,
          verifiedAt: null,
          verificationMode: null,
          autoRenews: false,
        }
      : {
          version: 2,
          kind: entitlementState === "expired" ? "temporary" : "premium",
          source: entitlementState === "expired"
            ? "trial"
            : platform === "ios"
              ? "app_store"
              : "play_store",
          expiresAt: entitlementState === "expired"
            ? "2020-01-01T00:00:00.000Z"
            : new Date(now + 30 * 24 * 60 * 60 * 1_000).toISOString(),
          verifiedAt: new Date(
            entitlementState === "stale"
              ? now - 96 * 60 * 60 * 1_000
              : entitlementState === "offline"
                ? now - 60 * 60 * 1_000
                : now,
          ).toISOString(),
          verificationMode:
            entitlementState === "offline" || entitlementState === "stale"
              ? "offline"
              : "online",
          autoRenews: entitlementState === "premium",
        };

    Object.defineProperty(window, "Capacitor", {
      configurable: true,
      value: {
        getPlatform: () => platform,
        isNativePlatform: () => platform !== "web",
      },
    });

    Object.defineProperty(window, "ChessCoachPurchases", {
      configurable: true,
      value: {
        getCurrentEntitlement: async () => entitlementValue,
        getOfferings: async () => [
          {
            productId: "premium.monthly",
            title: "Premium на месяц",
            description: "Ежемесячная подписка",
            price: "499 ₽",
            period: "month",
          },
          {
            productId: "premium.annual",
            title: "Premium на год",
            description: "Годовая подписка",
            price: "3 990 ₽",
            period: "year",
          },
        ],
        purchase: async () => ({
          version: 2,
          kind: "premium",
          source: platform === "ios" ? "app_store" : "play_store",
          expiresAt: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1_000,
          ).toISOString(),
          verifiedAt: new Date().toISOString(),
          verificationMode: "online",
          autoRenews: true,
        }),
        restorePurchases: async () => entitlementValue,
        openSubscriptionManagement: async () => {
          window.sessionStorage.setItem(
            "chess-coach.e2e-subscription-management-opened",
            "true",
          );
        },
      },
    });

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
    entitlementState: entitlement,
    entries: storageEntries,
    indexedDbState: indexedDb,
    platform: nativePlatform,
  });
}

export async function waitForStableInterface(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
}
