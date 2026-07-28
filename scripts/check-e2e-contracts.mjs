import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const e2eDirectory = resolve(root, "e2e");
const specFiles = (await readdir(e2eDirectory))
  .filter((file) => file.endsWith(".spec.ts"))
  .sort();
const violations = [];

for (const file of specFiles) {
  const source = await readFile(resolve(e2eDirectory, file), "utf8");

  if (!source.includes("installDeterministicAppState")) {
    violations.push(`${file}: не использует единый детерминированный стенд`);
  }

  if (/window\.localStorage\.(?:clear|setItem)\s*\(/u.test(source)) {
    violations.push(`${file}: вручную создаёт localStorage вместо testHarness`);
  }

  if (/window\.sessionStorage\.setItem\s*\(/u.test(source)) {
    violations.push(`${file}: вручную создаёт sessionStorage вместо testHarness`);
  }

  if (/page\.goto\s*\(/u.test(source)) {
    violations.push(`${file}: должен запускать приложение через openApplication`);
  }

  if (!source.includes("openApplication")) {
    violations.push(`${file}: не проверяет ошибку запуска приложения`);
  }
}

for (const file of ["learning-cycle.spec.ts", "accessibility.spec.ts"]) {
  const source = await readFile(resolve(e2eDirectory, file), "utf8");

  if (!source.includes("openWorkspace") || !source.includes("openCollapsibleSection")) {
    violations.push(
      `${file}: критический путь должен открывать вкладку и секцию через общий стенд`,
    );
  }
}

const playwrightConfigSource = await readFile(
  resolve(root, "playwright.config.ts"),
  "utf8",
);
const testHarnessSource = await readFile(
  resolve(e2eDirectory, "testHarness.ts"),
  "utf8",
);

if (!playwrightConfigSource.includes('process.env.E2E_REUSE_SERVER === "1"')) {
  violations.push(
    "playwright.config.ts: повторное использование сервера разрешается только явно",
  );
}

if (/Object\.defineProperty\(window,\s*["']Capacitor["']/u.test(testHarnessSource)) {
  violations.push(
    "testHarness.ts: нельзя подменять window.Capacitor до загрузки Capacitor runtime",
  );
}

const onboardingSource = await readFile(
  resolve(e2eDirectory, "onboarding.spec.ts"),
  "utf8",
);

if (!onboardingSource.includes('onboarding: "pending"')) {
  violations.push(
    "onboarding.spec.ts: сценарий первого запуска должен явно запрашивать pending",
  );
}

if (violations.length > 0) {
  console.error("E2E contract check failed:\n");
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exitCode = 1;
} else {
  console.log(
    `E2E contract check passed: ${specFiles.length} specs use the shared state harness`,
  );
}
