import { expect, test } from "@playwright/test";
import {
  installDeterministicAppState,
  openApplication,
} from "./testHarness";

test.beforeEach(async ({ page }) => {
  await installDeterministicAppState(page, { activeWorkspace: "coach" });
});

test("нативная ссылка открывает нужную рабочую область", async ({ page }) => {
  await openApplication(page);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("chess-coach:native-deep-link", {
      detail: { url: "chesscoach://workspace/tools" },
    }));
  });

  await expect(page.getByRole("tab", { name: /Ещё/u }))
    .toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("PGN и FEN", { exact: true })).toBeVisible();
});
