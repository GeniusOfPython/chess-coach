import type { BotGameTermination } from "./gameTypes";

export function parseBotGameStarted(value: string | null) {
  return value === "true";
}

export function parseGameTermination(value: unknown): BotGameTermination | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("reason" in value) ||
    !("winner" in value) ||
    !("result" in value) ||
    value.reason !== "resignation" ||
    (value.winner !== "white" && value.winner !== "black") ||
    (value.result !== "1-0" && value.result !== "0-1") ||
    (value.winner === "white" && value.result !== "1-0") ||
    (value.winner === "black" && value.result !== "0-1")
  ) {
    return null;
  }

  return {
    reason: "resignation",
    winner: value.winner,
    result: value.result,
  };
}
