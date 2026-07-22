import { gzipSync } from "node:zlib";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const distDirectory = resolve(root, "dist");
const budgetPath = resolve(root, "performance-budget.json");
const reportPath = resolve(root, "performance-budget-report.json");

async function collectFiles(directory, relativeDirectory = "") {
  const entries = await readdir(resolve(directory, relativeDirectory), {
    withFileTypes: true,
  });
  const nestedFiles = await Promise.all(entries.map(async (entry) => {
    const relativePath = [relativeDirectory, entry.name]
      .filter(Boolean)
      .join("/");

    return entry.isDirectory()
      ? collectFiles(directory, relativePath)
      : [relativePath];
  }));

  return nestedFiles.flat().sort();
}

async function fileSize(relativePath) {
  return (await stat(resolve(distDirectory, relativePath))).size;
}

async function gzipSize(relativePath) {
  return gzipSync(await readFile(resolve(distDirectory, relativePath))).byteLength;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

const budget = JSON.parse(await readFile(budgetPath, "utf8"));
const files = await collectFiles(distDirectory);
const indexHtml = await readFile(resolve(distDirectory, "index.html"), "utf8");
const initialReferences = [...indexHtml.matchAll(/(?:src|href)="(\/[^"#?]+)[^"]*"/g)]
  .map((match) => match[1].slice(1))
  .filter((reference) => files.includes(reference));
const initialJavaScript = initialReferences.filter((file) => file.endsWith(".js"));
const initialStylesheets = initialReferences.filter((file) => file.endsWith(".css"));
const stockfishWasm = files.filter(
  (file) => file.startsWith("stockfish/") && file.endsWith(".wasm"),
);

const fileSizes = new Map(
  await Promise.all(files.map(async (file) => [file, await fileSize(file)])),
);
const actual = {
  initialJavaScriptBytes: sum(initialJavaScript.map((file) => fileSizes.get(file))),
  initialJavaScriptGzipBytes: sum(
    await Promise.all(initialJavaScript.map(gzipSize)),
  ),
  initialStylesheetBytes: sum(initialStylesheets.map((file) => fileSizes.get(file))),
  initialStylesheetGzipBytes: sum(
    await Promise.all(initialStylesheets.map(gzipSize)),
  ),
  initialDocumentBytes:
    fileSizes.get("index.html") +
    sum(initialReferences.map((file) => fileSizes.get(file))),
  stockfishWasmBytes: sum(stockfishWasm.map((file) => fileSizes.get(file))),
  totalDistBytes: sum([...fileSizes.values()]),
};

const metrics = Object.entries(budget.build).map(([id, maximumBytes]) => {
  const actualBytes = actual[id];
  return {
    id,
    actualBytes,
    maximumBytes,
    utilizationPercent: Number(((actualBytes / maximumBytes) * 100).toFixed(1)),
    status: actualBytes <= maximumBytes ? "passed" : "failed",
  };
});
const failedMetrics = metrics.filter((metric) => metric.status === "failed");
const report = {
  schemaVersion: budget.schemaVersion,
  status: failedMetrics.length === 0 ? "passed" : "failed",
  generatedAt: new Date().toISOString(),
  files: {
    initialJavaScript,
    initialStylesheets,
    stockfishWasm,
    totalCount: files.length,
  },
  metrics,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log("Performance budget");
for (const metric of metrics) {
  console.log(
    `- ${metric.id}: ${formatBytes(metric.actualBytes)} / ${formatBytes(metric.maximumBytes)} (${metric.utilizationPercent}%)`,
  );
}

if (failedMetrics.length > 0) {
  const details = failedMetrics
    .map((metric) => `${metric.id}: ${formatBytes(metric.actualBytes)} > ${formatBytes(metric.maximumBytes)}`)
    .join("; ");
  throw new Error(`Performance budget exceeded: ${details}`);
}

console.log(`Performance budget passed: ${files.length} production files`);
