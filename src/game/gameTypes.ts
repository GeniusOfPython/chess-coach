export type GameMode = "analysis" | "bot";

export type BotGameTermination = {
  reason: "resignation";
  winner: "white" | "black";
  result: "1-0" | "0-1";
};
