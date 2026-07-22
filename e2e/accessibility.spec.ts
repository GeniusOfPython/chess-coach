import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { installDeterministicAppState } from "./testHarness";

async function expectNoAccessibilityViolations(page: Page, state: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    nodes: violation.nodes.map((node) => node.target.join(" ")),
  }));

  await test.info().attach(`axe-${state}.json`, {
    body: Buffer.from(JSON.stringify(violations, null, 2)),
    contentType: "application/json",
  });

  expect(violations, `Accessibility violations in state: ${state}`).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await installDeterministicAppState(page, { activeWorkspace: "tools" });
});

test("главный экран и панель импорта соответствуют WCAG 2.1 AA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Шахматный помощник" })).toBeVisible();

  await expectNoAccessibilityViolations(page, "main-screen");
  await page.getByText("PGN и FEN", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Импортировать PGN" })).toBeVisible();

  await expectNoAccessibilityViolations(page, "pgn-panel");
});
