export type EngineAnalysis = {
  bestMove: string;
  evaluation: number | null;
  mate: number | null;
  depth: number;
  variation: string[];
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

  private evaluation: number | null = null;
  private mate: number | null = null;
  private depth = 0;
  private variation: string[] = [];

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
      this.rejectAnalysis?.(
        new Error("Не удалось запустить Stockfish"),
      );
    };

    this.send("uci");
  }

  private send(command: string) {
    this.worker.postMessage(command);
  }

  private handleMessage(message: string) {
    if (message === "uciok") {
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

  private parseInfo(message: string) {
    const depthMatch = message.match(/\bdepth\s+(\d+)/);
    const cpMatch = message.match(
      /\bscore\s+cp\s+(-?\d+)/,
    );
    const mateMatch = message.match(
      /\bscore\s+mate\s+(-?\d+)/,
    );
    const pvMatch = message.match(/\bpv\s+(.+)$/);

    if (depthMatch) {
      this.depth = Number(depthMatch[1]);
    }

    if (cpMatch) {
      this.evaluation = Number(cpMatch[1]) / 100;
      this.mate = null;
    }

    if (mateMatch) {
      this.mate = Number(mateMatch[1]);
      this.evaluation = null;
    }

    if (pvMatch) {
      this.variation = pvMatch[1]
        .trim()
        .split(/\s+/);
    }
  }

  private finishAnalysis(message: string) {
    const bestMove =
      message.match(/^bestmove\s+(\S+)/)?.[1] ?? "";

    this.resolveAnalysis?.({
      bestMove,
      evaluation: this.evaluation,
      mate: this.mate,
      depth: this.depth,
      variation: this.variation,
    });

    this.resolveAnalysis = null;
    this.rejectAnalysis = null;
  }

  async analyze(
    fen: string,
  ): Promise<EngineAnalysis> {
    await this.readyPromise;

    
    this.evaluation = null;
    this.mate = null;
    this.depth = 0;
    this.variation = [];

    return new Promise<EngineAnalysis>(
      (resolve, reject) => {
        this.resolveAnalysis = resolve;
        this.rejectAnalysis = reject;

        this.send(`position fen ${fen}`);
        this.send("go movetime 1500");
      },
    );
  }

  stop() {
    this.send("stop");
  }

  destroy() {
    this.worker.terminate();
  }
}