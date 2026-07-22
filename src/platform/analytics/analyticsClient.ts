import type { GameMode } from "../../game/gameTypes";

type AnonymousProductProperties = Readonly<
  Record<string, string | number | boolean | null | undefined>
>;

type ProductEventMap = {
  game_started: AnonymousProductProperties;
  game_completed: {
    mode: GameMode;
    playerOutcome: "win" | "loss" | "draw" | "not_applicable";
    halfMoves: number;
    termination: "resignation" | "natural";
  };
  review_started: {
    mode: GameMode;
    totalPositions: number;
  };
  review_finished: {
    reviewedPositions: number;
    cachedPositions: number;
    restoredProgress: boolean;
  };
  training_started: {
    source: "current_position" | "game_review" | "spaced_repetition";
    sequenceTotal: number;
  };
  training_hint_revealed: {
    source: "current_position" | "game_review" | "spaced_repetition";
    hintLevel: number;
  };
  training_attempted: {
    source: "current_position" | "game_review" | "spaced_repetition";
    solved: boolean;
    hintLevel: number;
    sequenceIndex: number;
    sequenceTotal: number;
  };
  training_sequence_completed: {
    source: "current_position" | "game_review" | "spaced_repetition";
    sequenceTotal: number;
  };
  ai_coach_requested: AnonymousProductProperties;
  ai_coach_finished: AnonymousProductProperties;
};

const FORBIDDEN_PRODUCT_PROPERTY_NAMES = new Set([
  "fen",
  "pgn",
  "move",
  "moves",
  "san",
  "uci",
]);

function assertPrivacySafeProperties(value: unknown) {
  if (Array.isArray(value)) {
    value.forEach(assertPrivacySafeProperties);
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [propertyName, propertyValue] of Object.entries(value)) {
    const normalizedPropertyName = propertyName.toLowerCase();

    if (FORBIDDEN_PRODUCT_PROPERTY_NAMES.has(normalizedPropertyName)) {
      throw new Error(`запрещённое поле ${normalizedPropertyName}`);
    }

    assertPrivacySafeProperties(propertyValue);
  }
}

export type ProductEvent = {
  [Name in keyof ProductEventMap]: {
    schemaVersion: 1;
    name: Name;
    occurredAt: string;
    properties: ProductEventMap[Name];
  };
}[keyof ProductEventMap];

export type ProductAnalyticsProvider = {
  capture(event: ProductEvent): void | Promise<void>;
};

let provider: ProductAnalyticsProvider | null = null;

export function setProductAnalyticsProvider(
  nextProvider: ProductAnalyticsProvider | null,
) {
  provider = nextProvider;
}

export function createProductEvent<Name extends keyof ProductEventMap>(
  name: Name,
  properties: ProductEventMap[Name],
  occurredAt = new Date().toISOString(),
): Extract<ProductEvent, { name: Name }> {
  assertPrivacySafeProperties(properties);

  return {
    schemaVersion: 1,
    name,
    occurredAt,
    properties,
  } as Extract<ProductEvent, { name: Name }>;
}

export function trackProductEvent<Name extends keyof ProductEventMap>(
  name: Name,
  properties: ProductEventMap[Name],
) {
  if (!provider) {
    return;
  }

  const event = createProductEvent(name, properties);

  try {
    void Promise.resolve(provider.capture(event)).catch(() => undefined);
  } catch {
    // Аналитика не может прерывать партию или учебный сценарий.
  }
}
