# Product analytics contract

## Purpose

The analytics layer measures the core learning cycle without transferring game
content. Product code emits typed events through `trackProductEvent`; a concrete
analytics provider can be connected later through `setProductAnalyticsProvider`.
Until a provider is connected, events are discarded safely.

## Privacy boundary

Events may contain only the properties declared in
`src/platform/analytics/productEvents.ts`.

The contract intentionally excludes:

- FEN and PGN;
- played, recommended, or candidate moves;
- variation lines;
- game, account, or device identifiers;
- AI prompts, responses, and free text.

Runtime validation rejects additional fields. Provider failures never interrupt
the game, review, training, or AI fallback.

## Core funnel

1. `game_started`
2. `game_completed`
3. `review_started`
4. `review_finished`
5. `training_started`
6. `training_attempted`
7. `training_sequence_completed`

AI quality and availability are measured separately through
`ai_coach_requested` and `ai_coach_finished`.

## Provider integration

Connect a provider once at the application composition boundary. The adapter is
responsible for consent, transport, batching, retry policy, and environment
configuration. It must forward the received envelope without adding chess data.

```ts
setProductAnalyticsProvider({
  capture: async (event) => {
    await sendApprovedAnalyticsEvent(event);
  },
});
```

Production analytics must remain disabled until the consent model, retention
policy, server endpoint, and deletion process are approved.
