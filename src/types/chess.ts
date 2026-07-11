export type EngineAnalysis = {
  bestMove: string;
  evaluation: number | null;
  mate: number | null;
  depth: number;
  variation: string[];
};