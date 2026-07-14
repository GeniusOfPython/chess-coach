import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  StockfishAnalysisCancelledError,
  StockfishService,
} from "./StockfishService";

class FakeWorker {
  static instances: FakeWorker[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  commands: string[] = [];
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(command: string) {
    this.commands.push(command);
  }

  terminate() {
    this.terminated = true;
  }

  emit(message: string) {
    this.onmessage?.({ data: message } as MessageEvent);
  }
}

function createReadyService() {
  const service = new StockfishService();
  const worker = FakeWorker.instances.at(-1)!;

  worker.emit("uciok");
  worker.emit("readyok");

  return { service, worker };
}

async function flushPromises() {
  await vi.advanceTimersByTimeAsync(0);
  await Promise.resolve();
  await Promise.resolve();
}

describe("StockfishService", () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal("Worker", FakeWorker);
    vi.stubGlobal("window", globalThis);
  });

  it("возвращает результат анализа", async () => {
    const { service, worker } = createReadyService();
    const resultPromise = service.analyze("test-fen", { movetime: 100 });

    await flushPromises();
    worker.emit("info depth 8 score cp 35 pv e2e4 e7e5");
    worker.emit("bestmove e2e4");

    await expect(resultPromise).resolves.toMatchObject({
      bestMove: "e2e4",
      evaluation: 0.35,
      depth: 8,
    });
  });

  it("выполняет параллельные запросы последовательно", async () => {
    const { service, worker } = createReadyService();
    const first = service.analyze("first-fen", { movetime: 100 });
    const second = service.analyze("second-fen", { movetime: 100 });

    await flushPromises();
    expect(worker.commands.filter((command) => command.startsWith("go "))).toHaveLength(1);

    worker.emit("bestmove e2e4");
    await first;
    await flushPromises();

    expect(worker.commands.filter((command) => command.startsWith("go "))).toHaveLength(2);
    worker.emit("bestmove d2d4");
    await expect(second).resolves.toMatchObject({ bestMove: "d2d4" });
  });

  it("завершает ожидающий запрос при остановке", async () => {
    const { service, worker } = createReadyService();
    const resultPromise = service.analyze("test-fen", { movetime: 100 });

    await flushPromises();
    service.stop();

    await expect(resultPromise).rejects.toBeInstanceOf(
      StockfishAnalysisCancelledError,
    );
    expect(worker.commands).toContain("stop");
    expect(worker.commands).toContain("isready");
  });

  it("освобождает запрос после таймаута", async () => {
    const { service, worker } = createReadyService();
    const resultPromise = service.analyze("test-fen", {
      movetime: 100,
      timeoutMs: 50,
    });

    await flushPromises();
    const rejection = expect(resultPromise).rejects.toThrow(
      "Расчёт занял слишком много времени",
    );
    await vi.advanceTimersByTimeAsync(50);

    await rejection;
    expect(worker.commands).toContain("stop");
  });
});

