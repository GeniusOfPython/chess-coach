# Offline cache and mobile readiness

The browser/PWA version registers a service worker only in production builds.

Current behavior:

- caches the app shell;
- caches Stockfish JS/WASM files;
- uses runtime caching for same-origin Vite assets;
- falls back to `index.html` for navigation requests.

Why this matters for Android/iOS:

- the chess board and local Stockfish can keep working without network access;
- a future Capacitor shell can reuse the same storage/offline strategy;
- ads, subscriptions, cloud sync and neural explanations should remain separate optional online layers.

Development note:

- `npm run dev` does not register the service worker to avoid stale dev builds;
- test offline behavior with `npm run build` and `npm run preview`.
