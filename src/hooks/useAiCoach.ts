import { useEffect, useMemo, useRef, useState } from "react";
import { AiCoachError, AiCoachService } from "../ai/AiCoachService";
import { createAiCoachRequest, type AiCoachAdvice } from "../ai/coachContract";
import { aiCoachAdviceRepository } from "../repositories/aiCoachAdviceRepository";
import {
  getRemainingAiCoachAdvice,
} from "../ai/coachQuota";
import { aiCoachUsageRepository } from "../repositories/aiCoachUsageRepository";
import type {
  AiCoachQuota,
} from "../features/featureAccess";
import type { AiCoachServerQuota } from "../ai/coachQuotaProtocol";
import type { VerifiedChessFacts } from "../analysis/verifiedChessFacts";
import { trackProductEvent } from "../platform/analytics/analyticsClient";

export type AiCoachStatus =
  | "idle"
  | "loading"
  | "success"
  | "limited"
  | "error";

export type AiCoachLimitReason = "quota" | "temporary";

type Options = {
  facts: VerifiedChessFacts | null;
  quota: AiCoachQuota;
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

  if (error.code === "configuration") {
    return "ИИ-тренер пока недоступен. Базовый разбор продолжает работать.";
  }

  return "ИИ-тренер временно недоступен. Базовый разбор продолжает работать.";
}

export function useAiCoach({
  facts,
  quota,
  isOnline,
  enabled,
}: Options) {
  const serviceRef = useRef<AiCoachService | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<AiCoachStatus>("idle");
  const [advice, setAdvice] = useState<AiCoachAdvice | null>(null);
  const [adviceSource, setAdviceSource] = useState<"cache" | "live" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReason, setLimitReason] = useState<AiCoachLimitReason | null>(null);
  const [usage, setUsage] = useState(() => aiCoachUsageRepository.load(quota));
  const [serverQuota, setServerQuota] = useState<AiCoachServerQuota | null>(null);
  const remaining = serverQuota?.remaining ??
    getRemainingAiCoachAdvice(usage, quota);
  const quotaLimit = quota.limit;
  const quotaPeriod = quota.period;
  const request = useMemo(
    () => facts ? createAiCoachRequest(facts) : null,
    [facts],
  );

  useEffect(() => {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    setError(null);
    setLimitReason(null);
    setServerQuota(null);
    setAdviceSource(null);

    if (!enabled || !request) {
      setStatus("idle");
      setAdvice(null);
      return;
    }

    const cached = aiCoachAdviceRepository.load(request);

    if (cached) {
      setAdvice(cached.advice);
      setAdviceSource("cache");
      setStatus("success");
      return;
    }

    setStatus("idle");
    setAdvice(null);
  }, [enabled, request]);

  useEffect(() => () => activeRequestRef.current?.abort(), []);

  useEffect(() => {
    setUsage(aiCoachUsageRepository.load({
      limit: quotaLimit,
      period: quotaPeriod,
    }));
  }, [quotaLimit, quotaPeriod]);

  async function requestAdvice() {
    if (!enabled || !isOnline || !request || status === "loading") {
      return;
    }

    if (remaining <= 0) {
      setLimitReason("quota");
      setStatus("limited");
      return;
    }

    const controller = new AbortController();
    activeRequestRef.current?.abort();
    activeRequestRef.current = controller;
    setStatus("loading");
    setError(null);
    setLimitReason(null);
    trackProductEvent("ai_coach_requested", {
      quotaPeriod,
      remainingBeforeRequest: remaining,
    });

    try {
      serviceRef.current ??= new AiCoachService();
      const result = await serviceRef.current.getAdvice(
        request,
        controller.signal,
      );

      if (controller.signal.aborted) {
        return;
      }

      if (result.quota) {
        setServerQuota(result.quota);
      } else {
        setUsage(aiCoachUsageRepository.record(quota));
      }

      aiCoachAdviceRepository.save(request, result.advice);
      setAdvice(result.advice);
      setAdviceSource("live");
      setStatus("success");
      trackProductEvent("ai_coach_finished", {
        outcome: "success",
        quotaSource: result.quota ? "server" : "local",
      });
    } catch (requestError) {
      if (controller.signal.aborted) {
        return;
      }

      if (
        requestError instanceof AiCoachError &&
        (requestError.code === "rate_limited" ||
          requestError.code === "quota_exhausted")
      ) {
        if (requestError.quota) {
          setServerQuota(requestError.quota);
        }
        setLimitReason(
          requestError.code === "quota_exhausted" ? "quota" : "temporary",
        );
        setStatus("limited");
        trackProductEvent("ai_coach_finished", {
          outcome: "limited",
          reason: requestError.code,
        });
        return;
      }

      setError(errorMessage(requestError));
      setStatus("error");
      trackProductEvent("ai_coach_finished", {
        outcome: "error",
        reason: requestError instanceof AiCoachError
          ? requestError.code
          : "unknown",
      });
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
    }
  }

  return {
    request,
    status,
    advice,
    adviceSource,
    error,
    remaining,
    serverQuota,
    limitReason,
    requestAdvice,
  };
}
