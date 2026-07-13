import type {
  EngineAnalysis,
  EngineLine,
} from "../types/chess";

type AnalyzeOptions = {
  movetime?: number;
  multiPv?: number;
  timeoutMs?: number;
};

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
      this.finishWithError(new Error("Не удалось запустить Stockfish"));
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

    const rank = rankMatch ? Number(rankMatch[1]) : 1;

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
      existing.depth = Number(depthMatch[1]);
    }

    if (cpMatch) {
      existing.evaluation = Number(cpMatch[1]) / 100;
      existing.mate = null;
    }

    if (mateMatch) {
      existing.mate = Number(mateMatch[1]);
      existing.evaluation = null;
    }

    if (pvMatch) {
      existing.variation = pvMatch[1]
        .trim()
        .split(/\s+/);

      existing.bestMove = existing.variation[0] ?? "";
    }

    this.lines.set(rank, existing);
  }

  private finishAnalysis(message: string) {
    const bestMove =
      message.match(/^bestmove\s+(\S+)/)?.[1] ?? "";

    if (!bestMove || bestMove === "(none)") {
      this.finishWithError(
        new Error("Stockfish не вернул допустимый ход"),
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

    const primary = {
      ...sortedLines[0],
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

  async analyze(
    fen: string,
    options: AnalyzeOptions = {},
  ): Promise<EngineAnalysis> {
    await Promise.race([
      this.readyPromise,
      new Promise<void>((_, reject) => {
        window.setTimeout(
          () => reject(new Error("Stockfish не готов к работе")),
          5000,
        );
      }),
    ]);

    this.lines.clear();

    const multiPv = options.multiPv ?? 1;
    const movetime = options.movetime ?? 1500;
    const timeoutMs = options.timeoutMs ?? movetime + 3500;

    return new Promise<EngineAnalysis>(
      (resolve, reject) => {
        this.resolveAnalysis = resolve;
        this.rejectAnalysis = reject;

        this.analysisTimer = window.setTimeout(() => {
          this.stop();
          this.finishWithError(
            new Error("Stockfish не ответил вовремя"),
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

  stop() {
    this.clearAnalysisTimer();
    this.send("stop");
  }

  destroy() {
    this.clearAnalysisTimer();
    this.worker.terminate();
  }
}
