import type { Color } from "chess.js";
import type { SubscriptionTier } from "../../features/featureAccess";
import type { GameMode } from "../../game/gameTypes";
import type { BotLevelId } from "../../types/bot";

export const productEventSchemaVersion = 1 as const;

export type ProductEventProperties = {
  game_started: {
    mode: GameMode;
    playerSide: Color | null;
    botLevel: BotLevelId | null;
  };
  game_completed: {
    mode: GameMode;
    playerOutcome: "win" | "loss" | "draw" | "not_applicable";
    halfMoves: number;
    termination: "natural" | "resignation";
  };
  review_started: {
    mode: GameMode;
    totalPositions: number;
  };
  review_finished: {
    outcome: "completed" | "paused" | "error";
    processedPositions: number;
    totalPositions: number;
    reviewItems: number;
    cacheHits: number;
    resumed: boolean;
  };
  training_started: {
    source: "current_position" | "game_review" | "spaced_repetition" | "ai_reflection";
    sequenceTotal: number;
  };
  training_hint_revealed: {
    source: "current_position" | "game_review" | "spaced_repetition" | "ai_reflection";
    hintLevel: number;
  };
  training_attempted: {
    source: "current_position" | "game_review" | "spaced_repetition" | "ai_reflection";
    solved: boolean;
    hintLevel: number;
    sequenceIndex: number;
    sequenceTotal: number;
  };
  training_sequence_completed: {
    source: "current_position" | "game_review" | "spaced_repetition" | "ai_reflection";
    sequenceTotal: number;
  };
  ai_coach_requested: {
    tier: SubscriptionTier;
    remainingBeforeRequest: number;
  };
  ai_coach_finished: {
    tier: SubscriptionTier;
    outcome:
      | "success"
      | "quota_exhausted"
      | "rate_limited"
      | "timeout"
      | "invalid_response"
      | "configuration"
      | "unavailable";
  };
};

export type ProductEventName = keyof ProductEventProperties;

export type ProductEvent = {
  [Name in ProductEventName]: {
    schemaVersion: typeof productEventSchemaVersion;
    name: Name;
    occurredAt: string;
    properties: ProductEventProperties[Name];
  };
}[ProductEventName];

export type ProductEventFor<Name extends ProductEventName> = Extract<
  ProductEvent,
  { name: Name }
>;

const allowedPropertyNames = {
  game_started: ["mode", "playerSide", "botLevel"],
  game_completed: ["mode", "playerOutcome", "halfMoves", "termination"],
  review_started: ["mode", "totalPositions"],
  review_finished: [
    "outcome",
    "processedPositions",
    "totalPositions",
    "reviewItems",
    "cacheHits",
    "resumed",
  ],
  training_started: ["source", "sequenceTotal"],
  training_hint_revealed: ["source", "hintLevel"],
  training_attempted: [
    "source",
    "solved",
    "hintLevel",
    "sequenceIndex",
    "sequenceTotal",
  ],
  training_sequence_completed: ["source", "sequenceTotal"],
  ai_coach_requested: ["tier", "remainingBeforeRequest"],
  ai_coach_finished: ["tier", "outcome"],
} satisfies {
  [Name in ProductEventName]: readonly (keyof ProductEventProperties[Name])[];
};

const primitiveTypes = new Set(["string", "number", "boolean"]);

export function assertSafeProductEventProperties<Name extends ProductEventName>(
  name: Name,
  properties: ProductEventProperties[Name],
) {
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    throw new Error(`Некорректные свойства события ${name}`);
  }

  const allowed = new Set<string>(allowedPropertyNames[name]);
  const receivedKeys = Object.keys(properties);

  for (const key of receivedKeys) {
    if (!allowed.has(key)) {
      throw new Error(`Событие ${name} содержит запрещённое поле ${key}`);
    }
  }

  if ([...allowed].some((key) => !Object.hasOwn(properties, key))) {
    throw new Error(`Событие ${name} не соответствует схеме`);
  }

  for (const [key, value] of Object.entries(properties)) {
    if (!primitiveTypes.has(typeof value) || !Number.isFinite(value as number)) {
      if (typeof value !== "string" && typeof value !== "boolean" && value !== null) {
        throw new Error(`Событие ${name} содержит небезопасное значение ${key}`);
      }
    }
  }
}
