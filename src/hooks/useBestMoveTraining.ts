import { useState } from "react";
import type { BestMoveTrainingTask } from "../components/BestMoveTrainingPanel";

export const initialBestMoveTrainingTask: BestMoveTrainingTask = {
  status: "idle",
  positionFen: null,
  bestMove: null,
  playedMove: null,
  error: null,
  hintLevel: 0,
};

export function revealNextTrainingHint(task: BestMoveTrainingTask) {
  if (task.status !== "ready") return task;
  return { ...task, hintLevel: Math.min(task.hintLevel + 1, 3) };
}

export function useBestMoveTraining() {
  const [task, setTask] = useState<BestMoveTrainingTask>(
    initialBestMoveTrainingTask,
  );

  function resetTask() {
    setTask(initialBestMoveTrainingTask);
  }

  function prepareTask(positionFen: string) {
    setTask({
      ...initialBestMoveTrainingTask,
      status: "preparing",
      positionFen,
    });
  }

  function failTask(error: string) {
    setTask({ ...initialBestMoveTrainingTask, error });
  }

  function readyTask(positionFen: string, bestMove: string) {
    setTask({
      ...initialBestMoveTrainingTask,
      status: "ready",
      positionFen,
      bestMove,
    });
  }

  function revealHint() {
    setTask(revealNextTrainingHint);
  }

  function completeTask(playedMove: string, solved: boolean) {
    setTask((currentTask) => ({
      ...currentTask,
      status: solved ? "success" : "fail",
      playedMove,
    }));
  }

  return {
    task,
    resetTask,
    prepareTask,
    failTask,
    readyTask,
    revealHint,
    completeTask,
  };
}
