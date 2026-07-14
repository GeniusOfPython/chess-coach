import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { aiCoachDevelopmentPlugin } from "./server/viteAiCoachPlugin";

const serviceWorkerVersionPlaceholder = "__BUILD_VERSION__";
const serviceWorkerManifestPlaceholder = "/* __PRECACHE_MANIFEST__ */";

function normalizeBuildPath(path: string) {
  return path.replaceAll("\\", "/");
}

async function collectBuildFiles(
  directory: string,
  relativeDirectory = "",
): Promise<string[]> {
  const entries = await readdir(resolve(directory, relativeDirectory), {
    withFileTypes: true,
  });
  const files = await Promise.all(entries.map(async (entry) => {
    const relativePath = join(relativeDirectory, entry.name);

    if (entry.isDirectory()) {
      return collectBuildFiles(directory, relativePath);
    }

    return relativePath === "sw.js" ? [] : [relativePath];
  }));

  return files.flat().sort();
}

function automaticServiceWorkerVersion(): Plugin {
  let outputDirectory = "";

  return {
    name: "chess-coach-service-worker-version",
    apply: "build",
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const serviceWorkerPath = resolve(outputDirectory, "sw.js");
      const serviceWorker = await readFile(serviceWorkerPath, "utf8");

      if (
        !serviceWorker.includes(serviceWorkerVersionPlaceholder) ||
        !serviceWorker.includes(serviceWorkerManifestPlaceholder)
      ) {
        throw new Error("Service worker не подготовлен к production-сборке");
      }

      const hash = createHash("sha256");
      const buildFiles = await collectBuildFiles(outputDirectory);
      hash.update(serviceWorker);

      for (const relativePath of buildFiles) {
        hash.update(normalizeBuildPath(relativePath));
        hash.update(await readFile(resolve(outputDirectory, relativePath)));
      }

      const buildVersion = hash.digest("hex").slice(0, 12);
      const precacheManifest = buildFiles.map(
        (relativePath) => `/${normalizeBuildPath(relativePath)}`,
      );

      await writeFile(
        serviceWorkerPath,
        serviceWorker
          .replace(serviceWorkerVersionPlaceholder, buildVersion)
          .replace(
            serviceWorkerManifestPlaceholder,
            JSON.stringify(precacheManifest).slice(1, -1),
          ),
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      aiCoachDevelopmentPlugin({
        apiKey: environment.OPENAI_API_KEY,
        model: environment.OPENAI_MODEL,
      }),
      automaticServiceWorkerVersion(),
    ],
  };
});
