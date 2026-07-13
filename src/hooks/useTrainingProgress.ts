import { useEffect, useState } from "react";
import { readStorageValue, writeStorageValue } from "../platform/appStorage";
import { settingsStorageKeys } from "../platform/storageKeys";

const dailyTrainingGoal = 5;

function getTodayStorageKey() {
  return new Date().toISOString().slice(0, 10);
}

function readStoredNumber(key: string) {
  const value = Number(readStorageValue(key));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function readStoredDailySuccesses() {
  if (readStorageValue(settingsStorageKeys.trainingDailyDate) !== getTodayStorageKey()) {
    return 0;
  }
  return readStoredNumber(settingsStorageKeys.trainingDailySuccesses);
}

export function useTrainingProgress({
  onDailyGoalReached,
}: {
  onDailyGoalReached?: () => void;
} = {}) {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => readStoredNumber(settingsStorageKeys.trainingBestStreak));
  const [totalAttempts, setTotalAttempts] = useState(() => readStoredNumber(settingsStorageKeys.trainingTotalAttempts));
  const [totalSuccesses, setTotalSuccesses] = useState(() => readStoredNumber(settingsStorageKeys.trainingTotalSuccesses));
  const [dailySuccesses, setDailySuccesses] = useState(readStoredDailySuccesses);

  useEffect(() => writeStorageValue(settingsStorageKeys.trainingBestStreak, String(bestStreak)), [bestStreak]);
  useEffect(() => writeStorageValue(settingsStorageKeys.trainingTotalAttempts, String(totalAttempts)), [totalAttempts]);
  useEffect(() => writeStorageValue(settingsStorageKeys.trainingTotalSuccesses, String(totalSuccesses)), [totalSuccesses]);
  useEffect(() => {
    writeStorageValue(settingsStorageKeys.trainingDailyDate, getTodayStorageKey());
    writeStorageValue(settingsStorageKeys.trainingDailySuccesses, String(dailySuccesses));
  }, [dailySuccesses]);

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
