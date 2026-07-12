# Engine lifecycle

Stockfish is now created lazily.

Before this change, the app created several Web Workers immediately on page load:

- analysis engine;
- bot engine;
- review engine.

That worked on desktop, but it is wasteful for Android/iOS: a user can open the app, look at the board, change settings or import a game without needing Stockfish right away.

Now each engine starts only when it is first needed:

- `getAnalysisEngine()` starts the analysis worker;
- `getBotEngine()` starts the bot worker;
- `getReviewEngine()` starts the quick review worker.

The public behavior does not change. This is an internal optimization for startup speed, memory usage and battery life on mobile devices.
