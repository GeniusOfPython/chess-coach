import { describe, expect, it } from "vitest";
import {
  initialBestMoveTrainingTask,
  revealNextTrainingHint,
} from "./useBestMoveTraining";

describe("best move training task", () => {
  it("does not reveal hints before the task is ready", () => {
    expect(revealNextTrainingHint(initialBestMoveTrainingTask))
      .toBe(initialBestMoveTrainingTask);
  });

  it("reveals no more than three hints", () => {
    const readyTask = {
      ...initialBestMoveTrainingTask,
      status: "ready" as const,
      hintLevel: 3,
    };

    expect(revealNextTrainingHint(readyTask).hintLevel).toBe(3);
  });
});
