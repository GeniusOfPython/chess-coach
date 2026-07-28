import { useEffect, useState } from "react";
import type { AiCoachRequest } from "../ai/coachContract";
import {
  aiCoachReflectionRepository,
  maximumAiCoachReflectionLength,
} from "../repositories/aiCoachReflectionRepository";

export function useAiCoachReflection(request: AiCoachRequest | null) {
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const reflection = request ? aiCoachReflectionRepository.load(request) : null;
    setAnswer(reflection?.answer ?? "");
    setSaved(Boolean(reflection));
  }, [request]);

  function updateAnswer(value: string) {
    setAnswer(value.slice(0, maximumAiCoachReflectionLength));
    setSaved(false);
  }

  function save() {
    if (!request) {
      return;
    }

    const reflection = aiCoachReflectionRepository.save(request, answer);
    setAnswer(reflection?.answer ?? "");
    setSaved(Boolean(reflection));
  }

  function clear() {
    if (!request) {
      return;
    }

    aiCoachReflectionRepository.save(request, "");
    setAnswer("");
    setSaved(false);
  }

  return {
    answer,
    saved,
    maximumLength: maximumAiCoachReflectionLength,
    updateAnswer,
    save,
    clear,
  };
}
