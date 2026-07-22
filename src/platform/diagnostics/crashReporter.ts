export type DiagnosticSource =
  | "react-boundary"
  | "window-error"
  | "unhandled-rejection"
  | "storage-recovery";

export type DiagnosticReport = {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  source: DiagnosticSource;
  errorType: string;
  errorCategory: string;
  stack: string[];
  componentStack: string[];
  recovery?: {
    removedEntries: number;
    categories: string[];
  };
};

export type CrashReporter = {
  capture(report: DiagnosticReport): void | Promise<void>;
};

type CaptureExceptionOptions = {
  source: Exclude<DiagnosticSource, "storage-recovery">;
  componentStack?: string | null;
};

const maximumStackLines = 12;
const maximumLineLength = 240;
const maximumBufferedReports = 20;
const allowedErrorTypes = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "URIError",
  "EvalError",
  "AggregateError",
  "DOMException",
]);
const recentReports: DiagnosticReport[] = [];
let reporter: CrashReporter | null = null;

function createReportId() {
  return globalThis.crypto?.randomUUID?.() ??
    `diagnostic-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeLine(value: string) {
  return value
    .replace(/https?:\/\/[^\s)]+/giu, "[url]")
    .replace(/[a-z]:\\[^\s)]+/giu, "[path]")
    .replace(/\/(?:users|home)\/[^\s)]+/giu, "[path]")
    .replace(
      /[prnbqk1-8]+(?:\/[prnbqk1-8]+){7}\s+[wb]\s+(?:-|[kq]+)\s+(?:-|[a-h][36])\s+\d+\s+\d+/giu,
      "[fen]",
    )
    .slice(0, maximumLineLength);
}

function sanitizeStack(stack: string | null | undefined) {
  if (!stack) {
    return [];
  }

  return stack
    .split("\n")
    .slice(1, maximumStackLines + 1)
    .map((line) => sanitizeLine(line.trim()))
    .filter(Boolean);
}

function errorType(error: unknown) {
  if (error instanceof Error) {
    return allowedErrorTypes.has(error.name) ? error.name : "ApplicationError";
  }

  return "NonErrorRejection";
}

function errorCategory(error: unknown) {
  if (!(error instanceof Error)) {
    return "unknown-rejection";
  }

  const message = error.message.toLowerCase();

  if (/quota|storage|database|indexeddb/u.test(message)) return "storage";
  if (/network|fetch|offline|timeout/u.test(message)) return "network";
  if (/syntax|parse|json|pgn|fen/u.test(message)) return "invalid-data";
  if (error instanceof TypeError) return "type";
  if (error instanceof RangeError) return "range";
  return "application";
}

function dispatch(report: DiagnosticReport) {
  recentReports.push(report);

  if (recentReports.length > maximumBufferedReports) {
    recentReports.splice(0, recentReports.length - maximumBufferedReports);
  }

  if (!reporter) {
    return;
  }

  try {
    void Promise.resolve(reporter.capture(report)).catch(() => undefined);
  } catch {
    // Диагностика не должна становиться причиной второго сбоя.
  }
}

export function configureCrashReporter(nextReporter: CrashReporter | null) {
  reporter = nextReporter;
}

export function readRecentDiagnosticReports() {
  return recentReports.map((report) => ({
    ...report,
    stack: [...report.stack],
    componentStack: [...report.componentStack],
    recovery: report.recovery
      ? {
          ...report.recovery,
          categories: [...report.recovery.categories],
        }
      : undefined,
  }));
}

export function clearRecentDiagnosticReports() {
  recentReports.length = 0;
}

export function captureException(
  error: unknown,
  options: CaptureExceptionOptions,
) {
  const report: DiagnosticReport = {
    schemaVersion: 1,
    id: createReportId(),
    createdAt: new Date().toISOString(),
    source: options.source,
    errorType: errorType(error),
    errorCategory: errorCategory(error),
    stack: sanitizeStack(error instanceof Error ? error.stack : null),
    componentStack: sanitizeStack(options.componentStack),
  };

  dispatch(report);
  return report;
}

export function captureStorageRecovery({
  removedEntries,
  categories,
}: {
  removedEntries: number;
  categories: string[];
}) {
  const report: DiagnosticReport = {
    schemaVersion: 1,
    id: createReportId(),
    createdAt: new Date().toISOString(),
    source: "storage-recovery",
    errorType: "CorruptedLocalData",
    errorCategory: "storage",
    stack: [],
    componentStack: [],
    recovery: {
      removedEntries,
      categories: [...new Set(categories)].sort(),
    },
  };

  dispatch(report);
  return report;
}
