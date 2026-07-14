import { createHash } from "node:crypto";

const versionPlaceholder = "__BUILD_VERSION__";
const manifestPlaceholder = "/* __PRECACHE_MANIFEST__ */";

export type ServiceWorkerBuildFile = {
  path: string;
  content: string | Uint8Array;
};

function normalizePath(path: string) {
  const normalized = path.replaceAll("\\", "/").replace(/^\/+/, "");

  return `/${normalized}`;
}

export function buildServiceWorker({
  template,
  files,
}: {
  template: string;
  files: ServiceWorkerBuildFile[];
}) {
  if (
    !template.includes(versionPlaceholder) ||
    !template.includes(manifestPlaceholder)
  ) {
    throw new Error("Service worker не подготовлен к production-сборке");
  }

  const buildFiles = [...new Map(
    files
      .filter((file) => normalizePath(file.path) !== "/sw.js")
      .map((file) => [normalizePath(file.path), file]),
  ).entries()].sort(([left], [right]) => left.localeCompare(right));
  const hash = createHash("sha256");
  hash.update(template);

  for (const [path, file] of buildFiles) {
    hash.update(path);
    hash.update(file.content);
  }

  const version = hash.digest("hex").slice(0, 12);
  const precacheUrls = buildFiles.map(([path]) => path);

  return {
    version,
    precacheUrls,
    source: template
      .replace(versionPlaceholder, version)
      .replace(
        manifestPlaceholder,
        JSON.stringify(precacheUrls).slice(1, -1),
      ),
  };
}
