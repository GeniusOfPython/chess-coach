import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourceRoot = resolve(root, "src");
const serverRoot = resolve(root, "server");
const apiRoot = resolve(root, "api");
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

const forbiddenTargets = {
  analysis: new Set(["ai", "app", "components", "engine", "features", "game", "hooks", "theme"]),
  ai: new Set(["app", "components", "engine", "game", "hooks", "theme"]),
  engine: new Set(["ai", "analysis", "app", "components", "features", "game", "hooks", "platform", "theme", "utils"]),
  features: new Set(["ai", "analysis", "app", "components", "engine", "hooks", "platform", "theme", "utils"]),
  game: new Set(["ai", "analysis", "app", "components", "engine", "features", "hooks", "theme", "utils"]),
  platform: new Set(["ai", "analysis", "app", "components", "engine", "hooks", "theme", "utils"]),
  theme: new Set(["ai", "analysis", "app", "components", "engine", "features", "game", "hooks", "platform", "utils"]),
  types: new Set(["ai", "analysis", "app", "components", "engine", "features", "game", "hooks", "platform", "theme", "utils"]),
  utils: new Set(["ai", "analysis", "app", "components", "engine", "features", "game", "hooks", "platform", "theme"]),
};

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      return collectFiles(path);
    }

    return sourceExtensions.has(extname(entry.name)) ? [path] : [];
  }));

  return nested.flat().sort();
}

function normalizedPath(path) {
  return relative(root, path).split(sep).join("/");
}

function sourceLayer(path) {
  const relativePath = relative(sourceRoot, path);

  if (relativePath.startsWith(`..${sep}`) || relativePath === "..") {
    return null;
  }

  const [firstSegment] = relativePath.split(sep);
  return extname(firstSegment) ? "entry" : firstSegment;
}

function importedLayer(importer, specifier) {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const target = resolve(dirname(importer), specifier);
  const relativeTarget = relative(sourceRoot, target);

  if (relativeTarget.startsWith(`..${sep}`) || relativeTarget === "..") {
    return "outside-src";
  }

  const [firstSegment] = relativeTarget.split(sep);
  return extname(firstSegment) ? "entry" : firstSegment;
}

function importedSpecifiers(path, content) {
  const sourceFile = ts.createSourceFile(
    path,
    content,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const imports = [];

  for (const statement of sourceFile.statements) {
    if (
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      imports.push(statement.moduleSpecifier.text);
    }
  }

  return imports;
}

function resolveSourceModule(importer, specifier, knownFiles) {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const base = resolve(dirname(importer), specifier);
  const candidates = [
    base,
    ...[".ts", ".tsx", ".js", ".jsx", ".mjs"].map((extension) => `${base}${extension}`),
    ...[".ts", ".tsx", ".js", ".jsx", ".mjs"].map((extension) => resolve(base, `index${extension}`)),
  ];

  return candidates.find((candidate) => knownFiles.has(candidate)) ?? null;
}

function findCycles(graph) {
  const state = new Map();
  const stack = [];
  const cycles = [];

  function visit(node) {
    state.set(node, "visiting");
    stack.push(node);

    for (const target of graph.get(node) ?? []) {
      if (!state.has(target)) {
        visit(target);
      } else if (state.get(target) === "visiting") {
        const cycleStart = stack.indexOf(target);
        cycles.push([...stack.slice(cycleStart), target]);
      }
    }

    stack.pop();
    state.set(node, "visited");
  }

  for (const node of graph.keys()) {
    if (!state.has(node)) {
      visit(node);
    }
  }

  return cycles;
}

const roots = [sourceRoot, serverRoot, apiRoot];
const fileGroups = await Promise.all(roots.map(collectFiles));
const files = fileGroups.flat();
const knownFiles = new Set(files);
const graph = new Map(files.map((file) => [file, []]));
const violations = [];

for (const file of files) {
  const content = await readFile(file, "utf8");
  const imports = importedSpecifiers(file, content);
  const layer = sourceLayer(file);

  for (const specifier of imports) {
    const target = resolveSourceModule(file, specifier, knownFiles);

    if (target) {
      graph.get(file).push(target);
    }

    if (layer) {
      const targetLayer = importedLayer(file, specifier);

      if (targetLayer === "outside-src") {
        violations.push(`${normalizedPath(file)} импортирует код вне src: ${specifier}`);
      } else if (targetLayer && forbiddenTargets[layer]?.has(targetLayer)) {
        violations.push(
          `${normalizedPath(file)}: слой ${layer} не может импортировать ${targetLayer} (${specifier})`,
        );
      }
    } else if (
      (file.startsWith(serverRoot) || file.startsWith(apiRoot)) &&
      specifier.includes("/src/")
    ) {
      const targetLayer = target ? sourceLayer(target) : null;

      if (targetLayer && !new Set(["ai", "analysis", "types"]).has(targetLayer)) {
        violations.push(
          `${normalizedPath(file)}: сервер может использовать из src только контракты ai, analysis и types`,
        );
      }
    }
  }
}

for (const cycle of findCycles(graph)) {
  violations.push(`Циклическая зависимость: ${cycle.map(normalizedPath).join(" -> ")}`);
}

if (violations.length > 0) {
  console.error("Architecture check failed:\n");
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exitCode = 1;
} else {
  console.log(`Architecture check passed: ${files.length} modules, no forbidden imports or cycles`);
}
