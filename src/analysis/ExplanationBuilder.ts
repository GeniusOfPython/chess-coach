import type { MoveAnalysis } from "./MoveAnalyzer";

export function buildMoveExplanations(
  analysis: MoveAnalysis,
): string[] {
  if (!analysis.isLegal) {
    return ["Не удалось корректно разобрать ход Stockfish."];
  }

  const explanations: string[] = [];

  if (analysis.isCheckmate) {
    explanations.push(
      "Ход ставит мат и немедленно завершает партию.",
    );
  }

  if (analysis.isCastle) {
    explanations.push(
      "Рокировка уводит короля в безопасность и подключает ладью к игре.",
    );
  }

  if (analysis.isCapture && analysis.capturedPieceName) {
    explanations.push(
      `Ход выигрывает материал: забирает ${analysis.capturedPieceName} соперника.`,
    );
  }

  if (analysis.isPromotion) {
    explanations.push(
      "Пешка достигает последней горизонтали и превращается в сильную фигуру.",
    );
  }

  if (analysis.isDevelopment) {
    explanations.push(
      `Развивает ${analysis.pieceName} с начальной позиции.`,
    );
  }

  if (analysis.isCenterMove) {
    explanations.push(
      "Занимает или усиливает контроль центра.",
    );
  }

  if (analysis.opensDevelopmentLine) {
    explanations.push(
      "Освобождает линии для развития фигур и улучшает координацию.",
    );
  }

  if (analysis.isCheck) {
    explanations.push(
      "Даёт шах и заставляет соперника отвечать на угрозу королю.",
    );
  }

  if (analysis.isSupported) {
    explanations.push(
      "Фигура на конечном поле имеет поддержку.",
    );
  }

  if (
    analysis.isEarlyQueenMove &&
    explanations.length <= 1
  ) {
    explanations.push(
      "Ферзь выходит рано, но в этой позиции Stockfish считает это тактически оправданным.",
    );
  }

  if (explanations.length === 0) {
    explanations.push(
      "Ход улучшает позицию по расчёту Stockfish и ведёт к наиболее сильному продолжению.",
    );
  }

  return explanations.slice(0, 5);
}