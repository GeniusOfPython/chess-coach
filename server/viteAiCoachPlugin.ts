import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import {
  createAiCoachEndpoint,
  createMemoryRateLimiter,
  createOpenAiCoachProvider,
} from "./aiCoachServer";

const maximumDevelopmentBodyBytes = 20_000;

type AiCoachDevelopmentConfig = {
  apiKey?: string;
  model?: string;
};

export function isAiCoachDevelopmentConfigured({
  apiKey,
  model,
}: AiCoachDevelopmentConfig) {
  return Boolean(apiKey?.trim() && model?.trim());
}

function toWebHeaders(source: IncomingHttpHeaders) {
  const headers = new Headers();

  for (const [name, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(name, item));
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  return headers;
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;

    if (totalBytes > maximumDevelopmentBodyBytes) {
      throw new Error("request_too_large");
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

function resolveClientKey(request: IncomingMessage) {
  const forwarded = request.headers["x-forwarded-for"];

  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() || "development";
  }

  return request.socket.remoteAddress ?? "development";
}

async function sendWebResponse(
  target: ServerResponse,
  response: Response,
) {
  target.statusCode = response.status;
  response.headers.forEach((value, name) => target.setHeader(name, value));
  target.end(Buffer.from(await response.arrayBuffer()));
}

export function aiCoachDevelopmentPlugin({
  apiKey,
  model,
}: AiCoachDevelopmentConfig): Plugin {
  return {
    name: "chess-coach-ai-development-endpoint",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(
          request.url ?? "/",
          `http://${request.headers.host ?? "localhost"}`,
        );

        if (url.pathname !== "/api/coach") {
          next();
          return;
        }

        if (!isAiCoachDevelopmentConfigured({ apiKey, model })) {
          await sendWebResponse(
            response,
            Response.json(
              { error: "coach_not_configured" },
              { status: 503, headers: { "Cache-Control": "no-store" } },
            ),
          );
          return;
        }

        try {
          const body = request.method === "GET" || request.method === "HEAD"
            ? undefined
            : await readBody(request);
          const webRequest = new Request(url, {
            method: request.method,
            headers: toWebHeaders(request.headers),
            body,
          });
          const endpoint = createAiCoachEndpoint({
            provider: createOpenAiCoachProvider({
              apiKey: apiKey as string,
              model: model as string,
            }),
            consumeQuota: createMemoryRateLimiter({
              limit: 5,
              windowMs: 60_000,
            }),
          });

          await sendWebResponse(
            response,
            await endpoint(webRequest, resolveClientKey(request)),
          );
        } catch (error) {
          const requestTooLarge =
            error instanceof Error && error.message === "request_too_large";

          await sendWebResponse(
            response,
            Response.json(
              { error: requestTooLarge ? "request_too_large" : "coach_unavailable" },
              {
                status: requestTooLarge ? 413 : 503,
                headers: { "Cache-Control": "no-store" },
              },
            ),
          );
        }
      });
    },
  };
}
