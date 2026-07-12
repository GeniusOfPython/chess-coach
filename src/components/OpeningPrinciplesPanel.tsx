import { Chess, type Color, type Square } from "chess.js";

type Props = {
  fen: string;
};

type PrincipleState = "good" | "warning" | "neutral";

type PrincipleItem = {
  title: string;
  description: string;
  state: PrincipleState;
};

const sideNames: Record<Color, string> = {
  w: "белых",
  b: "чёрных",
};

function getFullMoveNumber(fen: string) {
  const value = Number(fen.split(" ")[5]);

  return Number.isFinite(value) ? value : 1;
}

function hasPiece({
  game,
  square,
  color,
  type,
}: {
  game: Chess;
  square: Square;
  color: Color;
  type: string;
}) {
  const piece = game.get(square);

  return piece?.color === color && piece.type === type;
}

function countDevelopedMinorPieces(game: Chess, color: Color) {
  const startingSquares: Square[] =
    color === "w"
      ? ["b1", "g1", "c1", "f1"]
      : ["b8", "g8", "c8", "f8"];

  return startingSquares.filter((square) => {
    const piece = game.get(square);

    return !piece || piece.color !== color;
  }).length;
}

function hasCenterPresence(game: Chess, color: Color) {
  const centerSquares: Square[] = ["d4", "e4", "d5", "e5"];

  return centerSquares.some((square) => {
    const piece = game.get(square);

    return piece?.color === color && piece.type === "p";
  });
}

function hasCastled(game: Chess, color: Color) {
  if (color === "w") {
    return (
      hasPiece({ game, square: "g1", color, type: "k" }) ||
      hasPiece({ game, square: "c1", color, type: "k" })
    );
  }

  return (
    hasPiece({ game, square: "g8", color, type: "k" }) ||
    hasPiece({ game, square: "c8", color, type: "k" })
  );
}

function hasEarlyQueenMove(game: Chess, color: Color) {
  const startingSquare = color === "w" ? "d1" : "d8";

  return !hasPiece({
    game,
    square: startingSquare,
    color,
    type: "q",
  });
}

function getSideItems({
  game,
  color,
  isOpening,
}: {
  game: Chess;
  color: Color;
  isOpening: boolean;
}): PrincipleItem[] {
  const developedMinorPieces = countDevelopedMinorPieces(
    game,
    color,
  );
  const centerPresence = hasCenterPresence(game, color);
  const castled = hasCastled(game, color);
  const earlyQueenMove = hasEarlyQueenMove(game, color);

  return [
    {
      title: `Центр у ${sideNames[color]}`,
      description: centerPresence
        ? "Есть пешечное присутствие в центре."
        : "Стоит подумать о ходе пешкой в центр или контроле центральных полей фигурами.",
      state: centerPresence ? "good" : "warning",
    },
    {
      title: `Развитие фигур у ${sideNames[color]}`,
      description:
        developedMinorPieces >= 3
          ? "Большинство лёгких фигур уже вышло с начальных клеток."
          : `Развито лёгких фигур: ${developedMinorPieces} из 4. В дебюте обычно важно быстрее вывести коней и слонов.`,
      state: developedMinorPieces >= 3 ? "good" : "warning",
    },
    {
      title: `Безопасность короля у ${sideNames[color]}`,
      description: castled
        ? "Король уже уведён рокировкой."
        : "Король пока в центре или без явной рокировки. Следи, чтобы он не застрял под атакой.",
      state: castled || !isOpening ? "good" : "warning",
    },
    {
      title: `Ферзь у ${sideNames[color]}`,
      description:
        earlyQueenMove && isOpening
          ? "Ферзь вышел рано. Это может быть тактически оправдано, но часто даёт сопернику темпы для атаки на ферзя."
          : "Ферзь не выглядит преждевременно выведенным.",
      state: earlyQueenMove && isOpening ? "neutral" : "good",
    },
  ];
}

function getNextFocus(game: Chess, isOpening: boolean) {
  if (!isOpening) {
    return "Дебютная стадия, скорее всего, уже завершена. Смотри на планы, слабости, активность фигур и безопасность короля.";
  }

  const sideToMove = game.turn();
  const developedMinorPieces = countDevelopedMinorPieces(
    game,
    sideToMove,
  );

  if (!hasCenterPresence(game, sideToMove)) {
    return `Для ${sideNames[sideToMove]} сейчас полезно решить вопрос центра: занять его пешкой или усилить контроль фигурами.`;
  }

  if (developedMinorPieces < 3) {
    return `Для ${sideNames[sideToMove]} главный учебный ориентир — развить лёгкие фигуры и не делать много ходов одной фигурой в дебюте.`;
  }

  if (!hasCastled(game, sideToMove)) {
    return `Для ${sideNames[sideToMove]} стоит подумать о безопасности короля и подготовке рокировки.`;
  }

  return `Для ${sideNames[sideToMove]} базовые дебютные задачи в целом выполнены. Можно искать активный план и улучшение худшей фигуры.`;
}

function getStateLabel(state: PrincipleState) {
  if (state === "good") {
    return "✓";
  }

  if (state === "warning") {
    return "!";
  }

  return "•";
}

export default function OpeningPrinciplesPanel({ fen }: Props) {
  const game = new Chess(fen);
  const fullMoveNumber = getFullMoveNumber(fen);
  const isOpening = fullMoveNumber <= 12;
  const whiteItems = getSideItems({
    game,
    color: "w",
    isOpening,
  });
  const blackItems = getSideItems({
    game,
    color: "b",
    isOpening,
  });
  const items = [...whiteItems, ...blackItems];

  return (
    <div className="opening-card">
      <span className="status-label">
        Дебютные принципы
      </span>

      <div className="opening-focus">
        <strong>Следующий учебный ориентир</strong>
        <p>{getNextFocus(game, isOpening)}</p>
      </div>

      <div className="opening-grid">
        {items.map((item) => (
          <div
            className={`opening-item ${item.state}`}
            key={item.title}
          >
            <span className="opening-marker">
              {getStateLabel(item.state)}
            </span>

            <div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
