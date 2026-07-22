import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

const root = process.cwd();
const reportPath = resolve(root, "quality-gate-report.json");
const withE2e = process.argv.includes("--with-e2e");
const startedAt = new Date();

const stages = [
  {
    id: "architecture",
    title: "Architecture boundaries",
    command: "npm",
    args: ["run", "check:architecture"],
  },
  {
    id: "lint",
    title: "Static analysis",
    command: "npm",
    args: ["run", "lint"],
  },
  {
    id: "unit",
    title: "Unit and integration tests",
    command: "npm",
    args: ["test"],
  },
  {
    id: "factual-eval",
    title: "AI Coach factual eval",
    command: "npm",
    args: ["run", "eval:ai-coach"],
  },
  {
    id: "build",
    title: "Production build",
    command: "npm",
    args: ["run", "build"],
  },
  {
    id: "artifact",
    title: "Production artifact verification",
    command: process.execPath,
    args: ["scripts/verify-build.mjs"],
  },
  {
    id: "performance-budget",
    title: "Production bundle performance budget",
    command: "npm",
    args: ["run", "check:performance-budget"],
  },
  ...(withE2e
    ? [
        {
          id: "e2e-smoke",
          title: "Critical learning-cycle smoke E2E",
          command: "npm",
          args: ["run", "test:e2e:smoke"],
          env: { E2E_USE_PREVIEW: "1" },
        },
        {
          id: "e2e-accessibility",
          title: "Accessibility smoke E2E",
          command: "npm",
          args: ["run", "test:e2e:a11y"],
          env: { E2E_USE_PREVIEW: "1" },
        },
        {
          id: "e2e-offline",
          title: "PWA offline E2E",
          command: "npm",
          args: ["run", "test:e2e:offline"],
          env: { E2E_USE_PREVIEW: "1" },
        },
        {
          id: "e2e-visual",
          title: "Desktop and mobile visual regression",
          command: "npm",
          args: ["run", "test:e2e:visual"],
          env: { E2E_USE_PREVIEW: "1" },
        },
        {
          id: "e2e-keyboard",
          title: "Keyboard navigation E2E",
          command: "npm",
          args: ["run", "test:e2e:keyboard"],
          env: { E2E_USE_PREVIEW: "1" },
        },
        {
          id: "e2e-performance",
          title: "Core Web Vitals performance E2E",
          command: "npm",
          args: ["run", "test:e2e:performance"],
          env: { E2E_USE_PREVIEW: "1" },
        },
        {
          id: "e2e-storage-recovery",
          title: "Corrupted local data recovery E2E",
          command: "npm",
          args: ["run", "test:e2e:recovery"],
          env: { E2E_USE_PREVIEW: "1" },
        },
        {
          id: "e2e-storage-migration",
          title: "IndexedDB migration and fallback E2E",
          command: "npm",
          args: ["run", "test:e2e:migration"],
          env: { E2E_USE_PREVIEW: "1" },
        },
        {
          id: "e2e-webkit",
          title: "WebKit and Safari compatibility E2E",
          command: "npm",
          args: ["run", "test:e2e:webkit"],
          env: { E2E_USE_PREVIEW: "1" },
        },
      ]
    : []),
];

const results = [];

function duration(milliseconds) {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

function saveReport(status) {
  writeFileSync(
    reportPath,
    `${JSON.stringify({
      schemaVersion: 1,
      status,
      includesE2e: withE2e,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      stages: results,
    }, null, 2)}\n`,
    "utf8",
  );
}

function runStage(stage, index) {
  console.log(`\n[${index + 1}/${stages.length}] ${stage.title}`);
  const stageStartedAt = performance.now();
  const result = spawnSync(stage.command, stage.args, {
    cwd: root,
    env: { ...process.env, ...stage.env },
    shell: process.platform === "win32" && stage.command === "npm",
    stdio: "inherit",
  });
  const durationMs = Math.round(performance.now() - stageStartedAt);
  const passed = result.status === 0 && !result.error;

  results.push({
    id: stage.id,
    title: stage.title,
    status: passed ? "passed" : "failed",
    durationMs,
    exitCode: result.status ?? 1,
  });

  if (!passed) {
    console.error(`Quality gate stopped at ${stage.id} after ${duration(durationMs)}`);
    if (result.error) console.error(result.error.message);
    saveReport("failed");
    process.exit(result.status ?? 1);
  }
}

console.log(`Quality gate: ${withE2e ? "CI/full" : "local"}`);
stages.forEach(runStage);
saveReport("passed");

const totalMs = results.reduce((sum, result) => sum + result.durationMs, 0);
console.log("\nQuality gate passed");
results.forEach((result) => {
  console.log(`- ${result.title}: ${duration(result.durationMs)}`);
});
console.log(`Total: ${duration(totalMs)}`);
