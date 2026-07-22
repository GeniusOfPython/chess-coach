import { afterEach, describe, expect, it } from "vitest";
import {
  captureException,
  captureStorageRecovery,
  clearRecentDiagnosticReports,
  configureCrashReporter,
  readRecentDiagnosticReports,
  type DiagnosticReport,
} from "./crashReporter";

afterEach(() => {
  configureCrashReporter(null);
  clearRecentDiagnosticReports();
});

describe("crashReporter", () => {
  it("не включает сообщение, FEN и пользовательские данные в отчёт", () => {
    const reports: DiagnosticReport[] = [];
    configureCrashReporter({
      capture(report) {
        reports.push(report);
      },
    });
    const privateFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const error = new Error(`Invalid FEN ${privateFen}`);
    error.stack = `Error: Invalid FEN ${privateFen}\n    at C:\\Users\\player\\secret.ts:12:4`;

    const report = captureException(error, { source: "react-boundary" });
    const serialized = JSON.stringify(report);

    expect(reports).toEqual([report]);
    expect(report.errorCategory).toBe("invalid-data");
    expect(serialized).not.toContain(privateFen);
    expect(serialized).not.toContain("player");
    expect(serialized).not.toContain("secret.ts");
    expect(serialized).not.toContain("Invalid FEN");
    expect(readRecentDiagnosticReports()).toEqual([report]);
  });

  it("не ломает приложение при ошибке внешнего провайдера", () => {
    configureCrashReporter({
      capture() {
        throw new Error("provider unavailable");
      },
    });

    expect(() => captureException(new TypeError("broken"), {
      source: "window-error",
    })).not.toThrow();
  });

  it("передаёт только количество и категории восстановленных записей", () => {
    const report = captureStorageRecovery({
      removedEntries: 3,
      categories: ["game", "preferences", "game"],
    });

    expect(report.recovery).toEqual({
      removedEntries: 3,
      categories: ["game", "preferences"],
    });
  });
});
