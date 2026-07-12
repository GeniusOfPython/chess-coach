import { analyzeMove } from "../analysis/MoveAnalyzer";
import { buildMoveExplanations } from "../analysis/ExplanationBuilder";

export function explainEngineMove(
  fen: string,
  engineMove: string,
): string[] {
  return buildMoveExplanations(
    analyzeMove(fen, engineMove),
  );
}
