import { expect, type Page } from "@playwright/test";

const startupErrorStorageKey = "chess-coach.e2e-startup-error";

type DeterministicAppStateOptions = {
  activeWorkspace?: "coach" | "game" | "tools" | "none";
  onboarding?: "complete" | "pending";
  entitlement?: "premium" | "free" | "expired" | "offline" | "stale";
  storageEntries?: Record<string, string>;
  indexedDb?: "available" | "unavailable";
};

export async function installDeterministicAppState(
  page: Page,
  {
    activeWorkspace = "coach",
    onboarding = "complete",
    entitlement = "premium",
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
  }) => {
    const installationMarker = "chess-coach.e2e-state-installed";

    const recordStartupError = (reason: unknown) => {
      const message = reason instanceof Error
        ? `${reason.name}: ${reason.message}`
        : typeof reason === "string"
          ? reason
          : "Неизвестная ошибка запуска";
      window.sessionStorage.setItem(
        "chess-coach.e2e-startup-error",
        message,
      );
    };

    window.addEventListener("error", (event) => {
      recordStartupError(event.error ?? event.message);
    });
    window.addEventListener("unhandledrejection", (event) => {
      recordStartupError(event.reason);
    });

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

    Object.defineProperty(window, "ChessCoachPurchases", {
      configurable: true,
      value: {
        getCurrentEntitlement: async () => {
          const runtimeOverride = window.sessionStorage.getItem(
            "chess-coach.e2e-entitlement-override",
          );
          return runtimeOverride ? JSON.parse(runtimeOverride) : entitlementValue;
        },
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
          source: "play_store",
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
  });
}

export async function openApplication(
  page: Page,
  options?: Parameters<Page["goto"]>[1],
) {
  await page.goto("/", options);

  await expect.poll(async () => page.evaluate((key) =>
    window.sessionStorage.getItem(key), startupErrorStorageKey
  ), {
    message: "Приложение завершило запуск с ошибкой JavaScript",
  }).toBeNull();

  await expect(
    page.getByRole("heading", { name: "Шахматный помощник" }),
  ).toBeVisible();
}

export async function waitForStableInterface(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
}

export async function openWorkspace(
  page: Page,
  workspace: "Учёба" | "Партия" | "Ещё",
) {
  const tab = page.getByRole("tab", { name: new RegExp(workspace, "u") });

  await expect(tab).toBeVisible();

  if (await tab.getAttribute("aria-selected") !== "true") {
    await tab.click();
  }

  await expect(tab).toHaveAttribute("aria-selected", "true");
}

export async function openCollapsibleSection(page: Page, title: string) {
  const summary = page.locator("summary").filter({ hasText: title }).first();
  const section = summary.locator("..");

  await expect(summary).toBeVisible();

  if (await section.getAttribute("open") === null) {
    await summary.click();
  }

  await expect(section).toHaveAttribute("open", "");
}

export async function setRuntimeEntitlementOverride(
  page: Page,
  entitlement: Record<string, unknown>,
) {
  await page.evaluate((value) => {
    window.sessionStorage.setItem(
      "chess-coach.e2e-entitlement-override",
      JSON.stringify(value),
    );
  }, entitlement);
}
