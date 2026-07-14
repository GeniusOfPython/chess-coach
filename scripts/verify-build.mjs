import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const outputDirectory = resolve(root, "dist");

async function collectFiles(directory, relativeDirectory = "") {
  const entries = await readdir(resolve(directory, relativeDirectory), {
    withFileTypes: true,
  });
  const files = await Promise.all(entries.map(async (entry) => {
    const relativePath = [relativeDirectory, entry.name]
      .filter(Boolean)
      .join("/");

    return entry.isDirectory()
      ? collectFiles(directory, relativePath)
      : [relativePath];
  }));

  return files.flat().sort();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const files = await collectFiles(outputDirectory);
const serviceWorker = await readFile(resolve(outputDirectory, "sw.js"), "utf8");
const manifest = JSON.parse(
  await readFile(resolve(outputDirectory, "manifest.webmanifest"), "utf8"),
);

assert(
  !serviceWorker.includes("__BUILD_VERSION__") &&
    !serviceWorker.includes("__PRECACHE_MANIFEST__"),
  "Service worker содержит незаменённые build-плейсхолдеры",
);

for (const file of files) {
  if (file === "sw.js") continue;

  assert(
    serviceWorker.includes(JSON.stringify(`/${file}`)),
    `Service worker не кэширует актуальный файл /${file}`,
  );
}

assert(manifest.name, "PWA manifest не содержит name");
assert(manifest.start_url === "/", "PWA manifest содержит неверный start_url");
assert(manifest.display === "standalone", "PWA manifest не использует standalone");
assert(
  Array.isArray(manifest.icons) && manifest.icons.length >= 2,
  "PWA manifest не содержит обязательные иконки",
);

console.log(`Build verification passed: ${files.length} files`);
