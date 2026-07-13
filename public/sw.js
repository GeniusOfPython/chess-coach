const CACHE_PREFIX = "chess-coach-";
const CACHE_VERSION = `${CACHE_PREFIX}v5`;

const APP_SHELL = [
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icons.svg",
  "/stockfish/stockfish-18-lite-single.js",
  "/stockfish/stockfish-18-lite-single.wasm",
];

function findBuildAssets(html) {
  const assets = new Set();
  const attributePattern = /(?:src|href)=["']([^"'#]+)["']/g;

  for (const match of html.matchAll(attributePattern)) {
    const assetUrl = new URL(match[1], self.location.origin);

    if (
      assetUrl.origin === self.location.origin &&
      assetUrl.pathname !== "/sw.js"
    ) {
      assets.add(`${assetUrl.pathname}${assetUrl.search}`);
    }
  }

  return [...assets];
}

async function precacheApplication() {
  const cache = await caches.open(CACHE_VERSION);
  const indexResponse = await fetch("/index.html", {
    cache: "no-store",
  });

  if (!indexResponse.ok) {
    throw new Error("Не удалось загрузить оболочку приложения");
  }

  const html = await indexResponse.clone().text();
  const buildAssets = findBuildAssets(html);

  await Promise.all([
    cache.put("/", indexResponse.clone()),
    cache.put("/index.html", indexResponse.clone()),
    cache.addAll([...new Set([...APP_SHELL, ...buildAssets])]),
  ]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheApplication());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) &&
                key !== CACHE_VERSION,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cachedPage =
          (await cache.match("/index.html")) ??
          (await cache.match("/"));

        if (cachedPage) {
          return cachedPage;
        }

        try {
          return await fetch(request);
        } catch {
          return new Response("Приложение пока недоступно офлайн.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const response = await fetch(request);

        if (response.ok && response.type === "basic") {
          await cache.put(request, response.clone());
        }

        return response;
      } catch {
        return new Response("Ресурс недоступен офлайн.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })(),
  );
});
