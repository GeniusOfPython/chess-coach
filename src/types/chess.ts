export type EngineLine = {
  rank: number;
  bestMove: string;
  evaluation: number | null;
  mate: number | null;
  depth: number;
  variation: string[];
};

export type EngineAnalysis = EngineLine & {
  lines: EngineLine[];
};
