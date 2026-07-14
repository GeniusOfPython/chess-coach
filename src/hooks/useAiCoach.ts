import { useEffect, useRef, useState } from "react";
import { AiCoachError, AiCoachService } from "../ai/AiCoachService";
import { createAiCoachRequest, type AiCoachAdvice } from "../ai/coachContract";
import {
  getRemainingAiCoachAdvice,
  readAiCoachUsage,
  recordAiCoachUsage,
} from "../ai/coachQuota";
import type { SubscriptionTier } from "../features/featureAccess";
import type { EngineAnalysis } from "../types/chess";

export type AiCoachStatus =
  | "idle"
  | "loading"
  | "success"
  | "limited"
  | "error";

export type AiCoachLimitReason = "daily" | "temporary";

type Options = {
  position: string;
  analysis: EngineAnalysis | null;
  subscriptionTier: SubscriptionTier;
  dailyLimit: number | null;
  isOnline: boolean;
  enabled: boolean;
};

function errorMessage(error: unknown) {
  if (!(error instanceof AiCoachError)) {
    return "Не удалось получить объяснение. Попробуй ещё раз.";
  }

  if (error.code === "timeout") {
    return "ИИ-тренер не успел ответить. Попробуй ещё раз.";
  }

  if (error.code === "rate_limited") {
    return "Слишком много запросов. Попробуй немного позже.";
  }

  if (error.code === "invalid_response") {
    return "Ответ не прошёл проверку. Запроси объяснение ещё раз.";
  }

  return "ИИ-тренер временно недоступен. План Stockfish продолжает работать.";
}

export function useAiCoach({
  position,
  analysis,
  subscriptionTier,
  dailyLimit,
  isOnline,
  enabled,
}: Options) {
  const serviceRef = useRef<AiCoachService | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<AiCoachStatus>("idle");
  const [advice, setAdvice] = useState<AiCoachAdvice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReason, setLimitReason] = useState<AiCoachLimitReason | null>(null);
  const [usage, setUsage] = useState(readAiCoachUsage);
  const remaining = getRemainingAiCoachAdvice(usage, dailyLimit);

  useEffect(() => {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    setStatus("idle");
    setAdvice(null);
    setError(null);
    setLimitReason(null);
  }, [position, analysis?.bestMove]);

  useEffect(() => () => activeRequestRef.current?.abort(), []);

  async function requestAdvice() {
    if (!enabled || !isOnline || !analysis || status === "loading") {
      return;
    }

    if (remaining !== null && remaining <= 0) {
      setLimitReason("daily");
      setStatus("limited");
      return;
    }

    const controller = new AbortController();
    activeRequestRef.current?.abort();
    activeRequestRef.current = controller;
    setStatus("loading");
    setError(null);
    setLimitReason(null);

    try {
      serviceRef.current ??= new AiCoachService();
      const result = await serviceRef.current.getAdvice(
        createAiCoachRequest({ fen: position, analysis }),
        controller.signal,
      );

      if (controller.signal.aborted) {
        return;
      }

      if (subscriptionTier === "free") {
        setUsage(recordAiCoachUsage());
      }

      setAdvice(result);
      setStatus("success");
    } catch (requestError) {
      if (controller.signal.aborted) {
        return;
      }

      if (
        requestError instanceof AiCoachError &&
        requestError.code === "rate_limited"
      ) {
        setLimitReason("temporary");
        setStatus("limited");
        return;
      }

      setError(errorMessage(requestError));
      setStatus("error");
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
    }
  }

  return {
    status,
    advice,
    error,
    remaining,
    limitReason,
    requestAdvice,
  };
}
