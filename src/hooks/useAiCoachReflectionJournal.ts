import { useCallback, useEffect, useState } from "react";
import {
  aiCoachReflectionRepository,
  type AiCoachReflectionEntry,
} from "../repositories/aiCoachReflectionRepository";

export function useAiCoachReflectionJournal() {
  const [entries, setEntries] = useState<AiCoachReflectionEntry[]>(() =>
    aiCoachReflectionRepository.list());

  const refresh = useCallback(() => {
    setEntries(aiCoachReflectionRepository.list());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function remove(key: string) {
    aiCoachReflectionRepository.remove(key);
    refresh();
  }

  function clear() {
    aiCoachReflectionRepository.clear();
    setEntries([]);
  }

  return { entries, remove, clear, refresh };
}
