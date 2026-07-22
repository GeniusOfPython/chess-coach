import { useEffect, useState } from "react";
import { trainingProgressRepository } from "../repositories/trainingProgressRepository";

const dailyTrainingGoal = 5;

export function useTrainingProgress({
  onDailyGoalReached,
}: {
  onDailyGoalReached?: () => void;
} = {}) {
  const [initialProgress] = useState(() => trainingProgressRepository.load());
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(initialProgress.bestStreak);
  const [totalAttempts, setTotalAttempts] = useState(initialProgress.totalAttempts);
  const [totalSuccesses, setTotalSuccesses] = useState(initialProgress.totalSuccesses);
  const [dailySuccesses, setDailySuccesses] = useState(initialProgress.dailySuccesses);

  useEffect(() => {
    trainingProgressRepository.save({
      bestStreak,
      totalAttempts,
      totalSuccesses,
      dailySuccesses,
    });
  }, [bestStreak, totalAttempts, totalSuccesses, dailySuccesses]);

  function recordAttempt(solved: boolean) {
    setTotalAttempts((value) => value + 1);
    if (!solved) {
      setCurrentStreak(0);
      return;
    }
    setTotalSuccesses((value) => value + 1);
    setDailySuccesses((value) => {
      const next = value + 1;
      if (value < dailyTrainingGoal && next >= dailyTrainingGoal) onDailyGoalReached?.();
      return next;
    });
    setCurrentStreak((value) => {
      const next = value + 1;
      setBestStreak((best) => Math.max(best, next));
      return next;
    });
  }

  function resetStats() {
    setCurrentStreak(0);
    setBestStreak(0);
    setTotalAttempts(0);
    setTotalSuccesses(0);
    setDailySuccesses(0);
  }

  return { currentStreak, bestStreak, totalAttempts, totalSuccesses, dailySuccesses, dailyGoal: dailyTrainingGoal, recordAttempt, resetStats };
}
