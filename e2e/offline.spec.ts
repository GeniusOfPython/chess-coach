import { expect, test } from "@playwright/test";

test("установленная PWA запускается без сети из актуального кеша", async ({
  context,
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const registrationState = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) {
      return { supported: false, active: false, controlled: false };
    }

    const registration = await navigator.serviceWorker.ready;

    return {
      supported: true,
      active: Boolean(registration.active),
      controlled: Boolean(navigator.serviceWorker.controller),
    };
  });

  expect(registrationState.supported).toBe(true);
  expect(registrationState.active).toBe(true);

  if (!registrationState.controlled) {
    await page.reload({ waitUntil: "networkidle" });
  }

  await expect.poll(
    () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
  ).toBe(true);

  const cachedApplicationFiles = await page.evaluate(async () => {
    const cacheNames = (await caches.keys()).filter((name) =>
      name.startsWith("chess-coach-build-"),
    );
    const cachedRequests = await Promise.all(
      cacheNames.map(async (name) => {
        const cache = await caches.open(name);
        return (await cache.keys()).map((request) => new URL(request.url).pathname);
      }),
    );

    return {
      cacheNames,
      paths: [...new Set(cachedRequests.flat())],
    };
  });

  expect(cachedApplicationFiles.cacheNames).toHaveLength(1);
  expect(cachedApplicationFiles.paths).toContain("/index.html");
  expect(cachedApplicationFiles.paths.some((path) => path.endsWith(".js"))).toBe(true);
  expect(cachedApplicationFiles.paths.some((path) => path.endsWith(".css"))).toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Шахматный помощник" })).toBeVisible();
  await expect(page.locator("#root")).not.toBeEmpty();

  const offlineAssetStatuses = await page.evaluate(async () => {
    const assetPaths = performance
      .getEntriesByType("resource")
      .map((entry) => new URL(entry.name).pathname)
      .filter((path) => path.endsWith(".js") || path.endsWith(".css"));

    return Promise.all(
      [...new Set(assetPaths)].map(async (path) => ({
        path,
        status: (await fetch(path)).status,
      })),
    );
  });

  expect(offlineAssetStatuses.length).toBeGreaterThan(0);
  expect(offlineAssetStatuses.every(({ status }) => status === 200)).toBe(true);
});
