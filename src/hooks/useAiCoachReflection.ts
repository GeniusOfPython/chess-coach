import { useEffect, useState } from "react";
import type { AiCoachRequest } from "../ai/coachContract";
import {
  aiCoachReflectionRepository,
  getAiCoachReflectionKey,
  maximumAiCoachReflectionLength,
  type AiCoachReflectionPractice,
} from "../repositories/aiCoachReflectionRepository";

export function useAiCoachReflection(request: AiCoachRequest | null) {
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState(false);
  const [practice, setPractice] = useState<AiCoachReflectionPractice | null>(null);

  useEffect(() => {
    const reflection = request ? aiCoachReflectionRepository.load(request) : null;
    setAnswer(reflection?.answer ?? "");
    setSaved(Boolean(reflection));
    setPractice(reflection?.practice ?? null);
  }, [request]);

  function updateAnswer(value: string) {
    setAnswer(value.slice(0, maximumAiCoachReflectionLength));
    setSaved(false);
    setPractice(null);
  }

  function save(question: string) {
    if (!request) {
      return;
    }

    const reflection = aiCoachReflectionRepository.save(request, answer, { question });
    setAnswer(reflection?.answer ?? "");
    setSaved(Boolean(reflection));
    setPractice(reflection?.practice ?? null);
  }

  function clear() {
    if (!request) {
      return;
    }

    aiCoachReflectionRepository.save(request, "");
    setAnswer("");
    setSaved(false);
    setPractice(null);
  }

  return {
    answer,
    saved,
    key: request ? getAiCoachReflectionKey(request) : null,
    practice,
    maximumLength: maximumAiCoachReflectionLength,
    updateAnswer,
    save,
    clear,
  };
}
