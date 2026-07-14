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
const indexHtml = await readFile(resolve(outputDirectory, "index.html"), "utf8");
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

const localReferences = [...indexHtml.matchAll(/(?:src|href)="(\/[^"#?]+)[^\"]*"/g)]
  .map((match) => match[1])
  .filter((reference) => reference !== "/")
  .map((reference) => reference.slice(1));

assert(
  localReferences.some((reference) => reference.endsWith(".css")),
  "Production index.html не подключает CSS-сборку",
);
assert(
  localReferences.some((reference) => reference.endsWith(".js")),
  "Production index.html не подключает JavaScript-сборку",
);
assert(
  !localReferences.includes("src/main.tsx"),
  "Production index.html сохранил ссылку на dev-entry",
);

for (const reference of localReferences) {
  assert(
    files.includes(reference),
    `Production index.html ссылается на отсутствующий файл /${reference}`,
  );
  assert(
    serviceWorker.includes(JSON.stringify(`/${reference}`)),
    `Service worker не кэширует ресурс index.html /${reference}`,
  );
}

assert(manifest.name, "PWA manifest не содержит name");
assert(manifest.start_url === "/", "PWA manifest содержит неверный start_url");
assert(manifest.display === "standalone", "PWA manifest не использует standalone");
assert(
  Array.isArray(manifest.icons) && manifest.icons.length >= 2,
  "PWA manifest не содержит обязательные иконки",
);

const documentThemeColor = indexHtml.match(
  /<meta\s+name="theme-color"\s+content="([^"]+)"\s*\/?>/i,
)?.[1];

assert(documentThemeColor, "Production index.html не содержит theme-color");
assert(
  documentThemeColor.toLowerCase() === manifest.theme_color.toLowerCase(),
  "theme-color в index.html и PWA manifest различается",
);

console.log(`Build verification passed: ${files.length} files`);
