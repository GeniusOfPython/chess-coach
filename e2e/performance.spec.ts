import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { installDeterministicAppState } from "./testHarness";

type WebVitals = {
  supported: {
    largestContentfulPaint: boolean;
    layoutShift: boolean;
    eventTiming: boolean;
  };
  largestContentfulPaintMs: number;
  cumulativeLayoutShift: number;
  interactionToNextPaintMs: number;
  observedInteractions: number;
};

const root = process.cwd();
const budget = JSON.parse(
  readFileSync(resolve(root, "performance-budget.json"), "utf8"),
) as {
  schemaVersion: number;
  webVitals: Omit<WebVitals, "supported" | "observedInteractions">;
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const supportedEntryTypes = PerformanceObserver.supportedEntryTypes;
    const state = {
      supported: {
        largestContentfulPaint: supportedEntryTypes.includes(
          "largest-contentful-paint",
        ),
        layoutShift: supportedEntryTypes.includes("layout-shift"),
        eventTiming: supportedEntryTypes.includes("event"),
      },
      largestContentfulPaintMs: 0,
      cumulativeLayoutShift: 0,
      interactionToNextPaintMs: 0,
      observedInteractions: 0,
    };

    Object.defineProperty(window, "__chessCoachWebVitals", {
      configurable: false,
      value: state,
    });

    if (state.supported.largestContentfulPaint) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.largestContentfulPaintMs = entry.startTime;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    }

    if (state.supported.layoutShift) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as PerformanceEntry & {
            hadRecentInput: boolean;
            value: number;
          };
          if (!layoutShift.hadRecentInput) {
            state.cumulativeLayoutShift += layoutShift.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    }

    if (state.supported.eventTiming) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const eventTiming = entry as PerformanceEntry & {
            duration: number;
            interactionId: number;
          };
          if (eventTiming.interactionId > 0) {
            state.observedInteractions += 1;
            state.interactionToNextPaintMs = Math.max(
              state.interactionToNextPaintMs,
              eventTiming.duration,
            );
          }
        }
      }).observe({ type: "event", buffered: true, durationThreshold: 16 });
    }
  });
  await installDeterministicAppState(page, { activeWorkspace: "coach" });
});

test("главный экран укладывается в бюджеты Core Web Vitals", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Шахматный помощник" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Партия/ }).click();
  await expect(page.getByRole("tab", { name: /Партия/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.waitForTimeout(250);

  const metrics = await page.evaluate(() => {
    const state = (
      window as typeof window & { __chessCoachWebVitals: WebVitals }
    ).__chessCoachWebVitals;
    return {
      ...state,
      largestContentfulPaintMs: Number(
        state.largestContentfulPaintMs.toFixed(1),
      ),
      cumulativeLayoutShift: Number(
        state.cumulativeLayoutShift.toFixed(4),
      ),
      interactionToNextPaintMs: Number(
        state.interactionToNextPaintMs.toFixed(1),
      ),
    };
  });
  const supported = Object.values(metrics.supported).every(Boolean);
  const passed =
    supported &&
    metrics.largestContentfulPaintMs > 0 &&
    metrics.observedInteractions > 0 &&
    metrics.largestContentfulPaintMs <=
      budget.webVitals.largestContentfulPaintMs &&
    metrics.cumulativeLayoutShift <=
      budget.webVitals.cumulativeLayoutShift &&
    metrics.interactionToNextPaintMs <=
      budget.webVitals.interactionToNextPaintMs;
  const report = {
    schemaVersion: budget.schemaVersion,
    status: passed ? "passed" : "failed",
    measuredAt: new Date().toISOString(),
    browser: test.info().project.name,
    budget: budget.webVitals,
    metrics,
  };
  const reportBody = JSON.stringify(report, null, 2);

  writeFileSync(resolve(root, "web-vitals-report.json"), `${reportBody}\n`);
  await test.info().attach("web-vitals-report.json", {
    body: Buffer.from(reportBody),
    contentType: "application/json",
  });

  expect(metrics.supported).toEqual({
    largestContentfulPaint: true,
    layoutShift: true,
    eventTiming: true,
  });
  expect(metrics.largestContentfulPaintMs).toBeGreaterThan(0);
  expect(metrics.observedInteractions).toBeGreaterThan(0);
  expect(metrics.largestContentfulPaintMs).toBeLessThanOrEqual(
    budget.webVitals.largestContentfulPaintMs,
  );
  expect(metrics.cumulativeLayoutShift).toBeLessThanOrEqual(
    budget.webVitals.cumulativeLayoutShift,
  );
  expect(metrics.interactionToNextPaintMs).toBeLessThanOrEqual(
    budget.webVitals.interactionToNextPaintMs,
  );
});
