import ChessCoachView from "./app/ChessCoachView";
import { useChessCoachController } from "./app/useChessCoachController";

function App() {
  const controller = useChessCoachController();

  return <ChessCoachView controller={controller} />;
}

export default App;
