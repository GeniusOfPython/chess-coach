import {
  parseAiCoachResponse,
  type AiCoachAdvice,
  type AiCoachRequest,
} from "./coachContract";
import {
  parseAiCoachQuotaHeaders,
  type AiCoachServerQuota,
} from "./coachQuotaProtocol";

export type AiCoachErrorCode =
  | "cancelled"
  | "timeout"
  | "rate_limited"
  | "quota_exhausted"
  | "configuration"
  | "unavailable"
  | "invalid_response";

export class AiCoachError extends Error {
  readonly code: AiCoachErrorCode;
  readonly quota: AiCoachServerQuota | null;

  constructor(
    message: string,
    code: AiCoachErrorCode,
    quota: AiCoachServerQuota | null = null,
  ) {
    super(message);
    this.name = "AiCoachError";
    this.code = code;
    this.quota = quota;
  }
}

export type AiCoachAdviceResult = {
  advice: AiCoachAdvice;
  quota: AiCoachServerQuota | null;
};

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export class AiCoachService {
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly fetcher: Fetcher;

  constructor({
    endpoint = "/api/coach",
    timeoutMs = 15_000,
    fetcher = fetch,
  }: {
    endpoint?: string;
    timeoutMs?: number;
    fetcher?: Fetcher;
  } = {}) {
    this.endpoint = endpoint;
    this.timeoutMs = timeoutMs;
    this.fetcher = fetcher;
  }

  async getAdvice(
    request: AiCoachRequest,
    externalSignal?: AbortSignal,
  ): Promise<AiCoachAdviceResult> {
    const controller = new AbortController();
    let timedOut = false;
    const abortRequest = () => controller.abort();
    externalSignal?.addEventListener("abort", abortRequest, { once: true });
    const timer = globalThis.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    try {
      const response = await this.fetcher(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      const serverQuota = parseAiCoachQuotaHeaders(response.headers);

      if (response.status === 429) {
        let quotaReason: unknown;

        try {
          const body = await response.json() as { reason?: unknown };
          quotaReason = body.reason;
        } catch {
          quotaReason = null;
        }

        const quotaExhausted =
          quotaReason === "daily" || quotaReason === "monthly";

        throw new AiCoachError(
          quotaExhausted
            ? "Квота ИИ-подсказок исчерпана"
            : "Лимит ИИ-подсказок временно исчерпан",
          quotaExhausted ? "quota_exhausted" : "rate_limited",
          serverQuota,
        );
      }

      if (!response.ok) {
        let publicError: unknown;

        try {
          const body = await response.json() as { error?: unknown };
          publicError = body.error;
        } catch {
          publicError = null;
        }

        throw new AiCoachError(
          publicError === "provider_configuration_error"
            ? "ИИ-тренер пока недоступен"
            : "ИИ-тренер временно недоступен",
          publicError === "provider_configuration_error"
            ? "configuration"
            : "unavailable",
        );
      }

      try {
        return {
          advice: parseAiCoachResponse(await response.json()).advice,
          quota: serverQuota,
        };
      } catch (error) {
        if (error instanceof AiCoachError) {
          throw error;
        }

        throw new AiCoachError(
          "ИИ-тренер вернул некорректный ответ",
          "invalid_response",
        );
      }
    } catch (error) {
      if (error instanceof AiCoachError) {
        throw error;
      }

      if (controller.signal.aborted) {
        throw new AiCoachError(
          timedOut ? "ИИ-тренер не ответил вовремя" : "Запрос отменён",
          timedOut ? "timeout" : "cancelled",
        );
      }

      throw new AiCoachError(
        "Не удалось связаться с ИИ-тренером",
        "unavailable",
      );
    } finally {
      globalThis.clearTimeout(timer);
      externalSignal?.removeEventListener("abort", abortRequest);
    }
  }
}
