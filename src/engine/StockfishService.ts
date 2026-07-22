import type {
  EngineAnalysis,
  EngineLine,
} from "../types/chess";

type AnalyzeOptions = {
  movetime?: number;
  multiPv?: number;
  timeoutMs?: number;
};

export class StockfishAnalysisCancelledError extends Error {
  constructor() {
    super("Анализ остановлен");
    this.name = "StockfishAnalysisCancelledError";
  }
}

export function isStockfishAnalysisCancelledError(error: unknown) {
  return error instanceof StockfishAnalysisCancelledError;
}

export class StockfishService {
  private worker: Worker;
  private readyPromise: Promise<void>;
  private resolveReady: (() => void) | null = null;

  private resolveAnalysis:
    | ((result: EngineAnalysis) => void)
    | null = null;

  private rejectAnalysis:
    | ((error: Error) => void)
    | null = null;

  private lines = new Map<number, EngineLine>();
  private analysisTimer: number | null = null;
  private analysisQueue: Promise<void> = Promise.resolve();
  private synchronizationPromise: Promise<void> = Promise.resolve();
  private resolveSynchronization: (() => void) | null = null;
  private generation = 0;
  private destroyed = false;

  constructor() {
    this.worker = new Worker(
      "/stockfish/stockfish-18-lite-single.js",
    );

    this.readyPromise = new Promise<void>((resolve) => {
      this.resolveReady = resolve;
    });

    this.worker.onmessage = (event) => {
      this.handleMessage(String(event.data));
    };

    this.worker.onerror = () => {
      this.finishWithError(new Error("Не удалось запустить анализ"));
    };

    this.send("uci");
  }

  private send(command: string) {
    this.worker.postMessage(command);
  }

  private handleMessage(message: string) {
    if (message === "uciok") {
      this.send("setoption name Threads value 1");
      this.send("setoption name Hash value 32");
      this.send("isready");
      return;
    }

    if (message === "readyok") {
      this.resolveReady?.();
      this.resolveReady = null;
      this.resolveSynchronization?.();
      this.resolveSynchronization = null;
      return;
    }

    if (message.startsWith("info ")) {
      this.parseInfo(message);
      return;
    }

    if (message.startsWith("bestmove ")) {
      this.finishAnalysis(message);
    }
  }

  private clearAnalysisTimer() {
    if (this.analysisTimer !== null) {
      window.clearTimeout(this.analysisTimer);
      this.analysisTimer = null;
    }
  }

  private finishWithError(error: Error) {
    this.clearAnalysisTimer();
    this.rejectAnalysis?.(error);
    this.resolveAnalysis = null;
    this.rejectAnalysis = null;
  }

  private interruptAnalysis(error: Error) {
    if (!this.rejectAnalysis) return;

    this.generation += 1;
    this.finishWithError(error);
    this.send("stop");

    this.synchronizationPromise = new Promise<void>((resolve) => {
      this.resolveSynchronization = resolve;
    });

    this.send("isready");
  }

  private waitForEngine(promise: Promise<void>) {
    return new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error("Анализ пока не готов"));
      }, 5000);

      promise.then(() => {
        window.clearTimeout(timer);
        resolve();
      }).catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
    });
  }

  private parseInfo(message: string) {
    const rankMatch = message.match(/\bmultipv\s+(\d+)/);
    const depthMatch = message.match(/\bdepth\s+(\d+)/);
    const cpMatch = message.match(
      /\bscore\s+cp\s+(-?\d+)/,
    );
    const mateMatch = message.match(
      /\bscore\s+mate\s+(-?\d+)/,
    );
    const pvMatch = message.match(/\bpv\s+(.+)$/);

    const rank = Number(rankMatch?.[1] ?? 1);

    const existing: EngineLine =
      this.lines.get(rank) ?? {
        rank,
        bestMove: "",
        evaluation: null,
        mate: null,
        depth: 0,
        variation: [],
      };

    if (depthMatch) {
      existing.depth = Number(depthMatch[1] ?? 0);
    }

    if (cpMatch) {
      existing.evaluation = Number(cpMatch[1] ?? 0) / 100;
      existing.mate = null;
    }

    if (mateMatch) {
      existing.mate = Number(mateMatch[1] ?? 0);
      existing.evaluation = null;
    }

    if (pvMatch) {
      existing.variation = pvMatch[1]?.trim().split(/\s+/) ?? [];

      existing.bestMove = existing.variation[0] ?? "";
    }

    this.lines.set(rank, existing);
  }

  private finishAnalysis(message: string) {
    if (!this.resolveAnalysis) return;

    const bestMove =
      message.match(/^bestmove\s+(\S+)/)?.[1] ?? "";

    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/u.test(bestMove)) {
      this.finishWithError(
        new Error("Не удалось получить допустимый ход"),
      );
      return;
    }

    const sortedLines = Array.from(this.lines.values())
      .filter((line) => line.bestMove)
      .sort((a, b) => a.rank - b.rank);

    if (sortedLines.length === 0) {
      sortedLines.push({
        rank: 1,
        bestMove,
        evaluation: null,
        mate: null,
        depth: 0,
        variation: [bestMove],
      });
    }

    const primaryLine = sortedLines[0];

    if (!primaryLine) {
      this.finishWithError(new Error("Движок не вернул основную линию"));
      return;
    }

    const primary: EngineLine = {
      ...primaryLine,
      bestMove,
    };

    const result: EngineAnalysis = {
      ...primary,
      lines: [
        primary,
        ...sortedLines
          .slice(1)
          .filter(
            (line) => line.bestMove !== primary.bestMove,
          ),
      ],
    };

    this.clearAnalysisTimer();
    this.resolveAnalysis?.(result);

    this.resolveAnalysis = null;
    this.rejectAnalysis = null;
  }

  private async runAnalysis(
    fen: string,
    options: AnalyzeOptions,
  ): Promise<EngineAnalysis> {
    await this.waitForEngine(this.readyPromise);
    await this.waitForEngine(this.synchronizationPromise);

    if (this.destroyed) {
      throw new StockfishAnalysisCancelledError();
    }

    this.lines.clear();

    const multiPv = options.multiPv ?? 1;
    const movetime = options.movetime ?? 1500;
    const timeoutMs = options.timeoutMs ?? movetime + 3500;

    return new Promise<EngineAnalysis>(
      (resolve, reject) => {
        this.resolveAnalysis = resolve;
        this.rejectAnalysis = reject;

        this.analysisTimer = window.setTimeout(() => {
          this.interruptAnalysis(
            new Error("Расчёт занял слишком много времени"),
          );
        }, timeoutMs);

        this.send(
          `setoption name MultiPV value ${multiPv}`,
        );
        this.send(`position fen ${fen}`);
        this.send(`go movetime ${movetime}`);
      },
    );
  }

  analyze(
    fen: string,
    options: AnalyzeOptions = {},
  ): Promise<EngineAnalysis> {
    const requestGeneration = this.generation;
    const request = this.analysisQueue.then(() => {
      if (
        this.destroyed ||
        requestGeneration !== this.generation
      ) {
        throw new StockfishAnalysisCancelledError();
      }

      return this.runAnalysis(fen, options);
    });

    this.analysisQueue = request.then(
      () => undefined,
      () => undefined,
    );

    return request;
  }

  stop() {
    this.interruptAnalysis(
      new StockfishAnalysisCancelledError(),
    );
  }

  destroy() {
    this.destroyed = true;
    this.generation += 1;
    this.finishWithError(
      new StockfishAnalysisCancelledError(),
    );
    this.resolveSynchronization?.();
    this.resolveSynchronization = null;
    this.worker.terminate();
  }
}
