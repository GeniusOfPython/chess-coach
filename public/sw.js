const CACHE_PREFIX = "chess-coach-";
const CACHE_VERSION = `${CACHE_PREFIX}build-__BUILD_VERSION__`;
const PRECACHE_URLS = [/* __PRECACHE_MANIFEST__ */];

async function precacheApplication() {
  const cache = await caches.open(CACHE_VERSION);
  await cache.addAll(PRECACHE_URLS);

  const cachedIndex = await cache.match("/index.html", {
    ignoreVary: true,
  });

  if (!cachedIndex) {
    throw new Error("Офлайн-оболочка приложения не собрана");
  }

  await cache.put("/", cachedIndex.clone());
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
          (await cache.match("/index.html", { ignoreVary: true })) ??
          (await cache.match("/", { ignoreVary: true }));

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
      const cacheKey = `${requestUrl.pathname}${requestUrl.search}`;
      const cachedResponse = await cache.match(cacheKey, {
        ignoreVary: true,
      });

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
